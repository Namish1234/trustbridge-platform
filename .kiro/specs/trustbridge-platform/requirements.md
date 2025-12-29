# Requirements Document

## Introduction

TrustBridge is an alternative credit scoring platform that leverages the RBI Account Aggregator (AA) framework to analyze bank statements, UPI transactions, and investments for users without traditional credit history. The platform targets Gen Z, first-time job seekers, freelancers, and small business owners who are financially underserved but tech-savvy.

## Glossary

- **AA_Framework**: RBI Account Aggregator framework for secure financial data sharing
- **Alternative_Score**: Credit score calculated from cash flow, investments, and payment patterns
- **FIU**: Financial Information User as defined by RBI guidelines
- **Traditional_Score**: Conventional CIBIL/credit bureau score
- **Grey_Market**: Unregulated, informal lending sector with high interest rates
- **Trust_System**: Security and compliance features ensuring user data protection
- **Benefit_Graph**: Visual line chart correlating Score with Interest Rates
- **Unlock_Limit**: The maximum estimated credit limit a user can access based on their score

## Requirements

### Requirement 1: User Authentication and Onboarding

**User Story:** As a user, I want to create an account using my existing credentials so I can access the platform quickly.

#### Acceptance Criteria

1. THE Trust_System SHALL use **Firebase Authentication** to handle user login and registration.
2. THE Navbar SHALL display a dedicated "Login" button allowing authentication via **Google OAuth** or **Email/Password**.
3. WHEN a user initiates account connection, THE AA_Framework SHALL authenticate via OTP without storing user banking credentials.
4. WHEN connecting multiple accounts, THE Trust_System SHALL request explicit consent for each data source.

### Requirement 2: Navigation and Global Layout

**User Story:** As a user, I want intuitive navigation with a clean top bar, so that I can easily access the Score, Compare, Dashboard, and About pages.

#### Acceptance Criteria

1. THE User_Interface SHALL feature a **Top Navigation Bar** on all pages.
2. THE Navbar SHALL be arranged with the **Logo in the center**, acting as a link to the Homepage.
3. THE Navbar SHALL place navigation links immediately next to the logo:
    - **Left of Logo:** "Score", "Compare"
    - **Right of Logo:** "Dashboard", "About"
4. THE User_Interface SHALL include a responsive, interactive Footer containing legal links, contact info, and site map.

### Requirement 3: Homepage Structure and Visuals

**User Story:** As a visitor, I want to see an engaging homepage that visually explains the credit problem using illustrations and charts.

#### Acceptance Criteria

1. THE Homepage SHALL utilize an **Alternating Layout (Z-pattern)** for content sections: Text on Left/Image on Right, followed by Image on Left/Text on Right.
2. THE Homepage SHALL include an **Interactive Pie Chart** (Animation Rich) visualizing the Indian Credit Market:
    - Segment A: Covered by Formal Credit
    - Segment B: New-to-Credit (Target Audience)
    - Segment C: Dependent on Grey Market
3. THE Homepage SHALL include a **Comparative Line Chart** plotting Interest Rates over time:
    - Line A (Red): Grey Market/Informal Rates (High/Volatile)
    - Line B (Green): TrustBridge/Formal Rates (Lower/Stable)

### Requirement 4: Financial Data Analysis and Score Generation

**User Story:** As a user without credit history, I want my cash flow and investment patterns analyzed so that I can receive a meaningful credit score.

#### Acceptance Criteria

1. WHEN analyzing bank statements, THE Alternative_Score SHALL consider salary credits, investment contributions, and bill payment patterns.
2. WHEN calculating scores, THE Trust_System SHALL process data locally without external transmission of raw financial details.
3. THE Alternative_Score SHALL update automatically when new transaction data becomes available.
4. WHEN score calculation completes, THE Trust_System SHALL provide a detailed breakdown of contributing factors.

### Requirement 5: Personal Data Visualization (Dashboard)

**User Story:** As a user, I want to see my specific alternative score growth so that I can understand my own financial progress.

#### Acceptance Criteria

1. THE Dashboard SHALL display the specific User's Traditional Score (flatline) vs. Alternative Score (growth curve).
2. WHEN hovering over personal data points, THE Data_Visualizer SHALL show tooltips explaining score contributors like "Salary Credited" or "SIP Investment".
3. WHEN score changes occur, THE Data_Visualizer SHALL highlight the specific factors causing the change.

### Requirement 6: Trust and Security Features

**User Story:** As a user sharing sensitive financial data, I want clear security indicators and compliance information.

#### Acceptance Criteria

1. THE Trust_System SHALL display "RBI Account Aggregator Framework Compliant" badge with lock icon.
2. THE Trust_System SHALL encrypt all data transmission using industry-standard protocols.
3. WHEN handling user data, THE Trust_System SHALL follow consent-based access patterns as per AA framework.
4. THE Trust_System SHALL provide clear privacy policy and data handling explanations.

### Requirement 7: Loan Eligibility and Partner Integration

**User Story:** As a user with an alternative credit score, I want to check my loan eligibility and receive offers.

#### Acceptance Criteria

1. WHEN alternative score meets thresholds, THE Trust_System SHALL display loan eligibility status.
2. THE Trust_System SHALL clearly indicate that loans are disbursed by partner banks, not the platform.
3. THE Trust_System SHALL allow users to compare multiple loan offers from different partners.

### Requirement 8: Data Processing and Storage Compliance

**User Story:** As a Financial Information User (FIU), I want to ensure all data processing meets RBI guidelines.

#### Acceptance Criteria

1. THE Trust_System SHALL act as a registered FIU under RBI guidelines for all data processing activities.
2. WHEN storing user data, THE Trust_System SHALL implement data retention policies compliant with AA framework.
3. WHEN users revoke consent, THE Trust_System SHALL immediately stop data access and purge stored information.

### Requirement 9: Design System Integration

**User Story:** As a user, I want a visual experience that feels professional and consistent.

#### Acceptance Criteria

1. THE User_Interface SHALL strictly adhere to the typography, color palette, and component styles defined in the separate **`design.md`** file.

### Requirement 10: The 'Calculate Score' Page Workflow

**User Story:** As a user, I want to verify my identity via PAN, authorize bank statement access via OTP, and immediately see my calculated score with its tangible financial benefits.

#### Acceptance Criteria

**10.1 Input & Identity Verification**
1. THE Page SHALL contain a form asking for **PAN Card Number**.
2. WHEN PAN is submitted, THE System SHALL trigger an **OTP Verification** to the registered mobile/email.
3. UPON OTP success, THE System SHALL present the **Account Aggregator Consent Modal** listing specific data permissions (Bank Statements, Duration).

**10.2 Calculation & Insights**
1. UPON Consent Grant, THE System SHALL display a "Calculating..." animation.
2. THE Result View SHALL display the **TrustScore** (Numerical Value) prominently.
3. THE Result View SHALL display a **"Score Analysis" Card** with two distinct columns:
   - **Positives (+):** (e.g., "Consistent UPI Payments", "Rising Savings Trend").
   - **Negatives (-):** (e.g., "High Cash Withdrawal", "Irregular Deposits").

**10.3 The 'Unlock' Graph & Limits**
1. THE Page SHALL display a **Dynamic Line Graph** titled "Interest Rate Unlock".
   - **X-Axis:** TrustScore (300 - 900).
   - **Y-Axis:** Interest Rate (%).
   - **Action:** The line slopes down (Higher Score = Lower Rate). A "You Are Here" dot MUST indicate the user's specific unlocked rate (e.g., 12%) vs Grey Market (24%).
2. THE Page SHALL display a large, bold metric: **"Maximum Credit Limit Accessed: ₹[Amount]"**.