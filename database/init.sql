-- TrustBridge Database Initialization Script

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types
CREATE TYPE user_kyc_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE consent_status AS ENUM ('active', 'revoked', 'expired');
CREATE TYPE account_type AS ENUM ('savings', 'current', 'investment', 'credit');
CREATE TYPE connection_status AS ENUM ('active', 'inactive', 'error');
CREATE TYPE transaction_type AS ENUM ('credit', 'debit');
CREATE TYPE score_trend AS ENUM ('improving', 'stable', 'declining');
CREATE TYPE score_factor_category AS ENUM ('income_stability', 'savings_rate', 'payment_behavior', 'investment_activity');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    firebase_uid VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    kyc_status user_kyc_status DEFAULT 'pending',
    consent_status consent_status DEFAULT 'active',
    last_login_at TIMESTAMP WITH TIME ZONE,
    pan_number VARCHAR(10), -- Encrypted
    is_active BOOLEAN DEFAULT true
);

-- Account connections table
CREATE TABLE account_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id VARCHAR(255) NOT NULL,
    institution_name VARCHAR(255) NOT NULL,
    account_type account_type NOT NULL,
    account_number VARCHAR(255), -- Encrypted
    connection_status connection_status DEFAULT 'active',
    last_sync_at TIMESTAMP WITH TIME ZONE,
    consent_expiry_at TIMESTAMP WITH TIME ZONE,
    encrypted_tokens TEXT, -- Encrypted AA tokens
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES account_connections(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    type transaction_type NOT NULL,
    category VARCHAR(100),
    description TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    balance DECIMAL(15,2),
    merchant_info VARCHAR(255),
    is_recurring BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Credit scores table
CREATE TABLE credit_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 300 AND score <= 850),
    score_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    traditional_score INTEGER CHECK (traditional_score >= 300 AND traditional_score <= 850),
    trend score_trend DEFAULT 'stable',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Score factors table
CREATE TABLE score_factors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    credit_score_id UUID NOT NULL REFERENCES credit_scores(id) ON DELETE CASCADE,
    category score_factor_category NOT NULL,
    impact INTEGER NOT NULL CHECK (impact >= -100 AND impact <= 100),
    description TEXT NOT NULL,
    weight DECIMAL(3,2) NOT NULL CHECK (weight >= 0 AND weight <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Loan eligibility table
CREATE TABLE loan_eligibility (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credit_score_id UUID NOT NULL REFERENCES credit_scores(id) ON DELETE CASCADE,
    is_eligible BOOLEAN NOT NULL,
    max_loan_amount DECIMAL(15,2),
    recommended_amount DECIMAL(15,2),
    min_interest_rate DECIMAL(5,2),
    max_interest_rate DECIMAL(5,2),
    eligibility_factors TEXT[], -- Array of factors
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Partner offers table
CREATE TABLE partner_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_eligibility_id UUID NOT NULL REFERENCES loan_eligibility(id) ON DELETE CASCADE,
    bank_id VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    loan_amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    tenure INTEGER NOT NULL, -- in months
    processing_fee DECIMAL(10,2),
    offer_valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT
);

-- Sessions table for JWT management
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_account_connections_user_id ON account_connections(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_credit_scores_user_id ON credit_scores(user_id);
CREATE INDEX idx_credit_scores_date ON credit_scores(score_date);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_success ON audit_logs(success);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_account_connections_updated_at BEFORE UPDATE ON account_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for development
INSERT INTO users (email, phone, firebase_uid, kyc_status) VALUES
('demo@trustbridge.com', '+919876543210', 'demo_firebase_uid', 'verified'),
('test@trustbridge.com', '+919876543211', 'test_firebase_uid', 'pending');

COMMIT;