import express, { Request, Response } from 'express';
import { body, query as queryValidator, validationResult } from 'express-validator';
import { authenticateToken, requireKYC, requireConsent } from '../middleware/auth';
import CreditScoringService from '../services/CreditScoringService';
import ScoreExplanationService from '../services/ScoreExplanationService';
import DataSufficiencyService from '../services/DataSufficiencyService';
import { CreditScoreModel } from '../models/CreditScore';

const router = express.Router();
const scoringService = new CreditScoringService();
const explanationService = new ScoreExplanationService();
const dataSufficiencyService = new DataSufficiencyService();

// Calculate credit score for user
router.post('/calculate',
  authenticateToken,
  requireKYC,
  requireConsent,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      console.log(`🔄 Calculating credit score for user ${req.user.userId}`);

      // Check data sufficiency first
      const eligibility = await dataSufficiencyService.canProceedWithScoring(req.user.userId);
      
      if (!eligibility.canProceed) {
        return res.status(400).json({
          error: 'Insufficient data for credit scoring',
          code: 'INSUFFICIENT_DATA',
          reason: eligibility.reason,
          minimumRequirements: eligibility.minimumRequirements,
          message: 'Please connect more accounts or wait for more transaction history'
        });
      }

      // Calculate credit score
      const scoreResult = await scoringService.calculateCreditScore(req.user.userId);

      // Store the calculated score
      const scoreId = await scoringService.storeScore(req.user.userId, scoreResult);

      res.json({
        message: 'Credit score calculated successfully',
        scoreId,
        score: scoreResult.score,
        confidence: scoreResult.confidence,
        trend: scoreResult.trend,
        factors: scoreResult.factors,
        recommendations: scoreResult.recommendations
      });

    } catch (error) {
      console.error('❌ Failed to calculate credit score:', error);
      
      if (error instanceof Error && error.message.includes('Insufficient transaction data')) {
        return res.status(400).json({
          error: 'Insufficient transaction data for scoring',
          code: 'INSUFFICIENT_DATA',
          message: 'Please connect more accounts or wait for more transaction history'
        });
      }

      res.status(500).json({ 
        error: 'Failed to calculate credit score',
        code: 'SCORE_CALCULATION_FAILED'
      });
    }
  }
);

// Get user's latest credit score
router.get('/latest',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const scoreData = await scoringService.getUserScore(req.user.userId);

      if (!scoreData || !scoreData.score) {
        return res.status(404).json({
          error: 'No credit score found',
          code: 'SCORE_NOT_FOUND',
          message: 'Please calculate your credit score first'
        });
      }

      res.json({
        score: scoreData.score,
        analysis: scoreData.analysis,
        recommendations: scoreData.recommendations
      });

    } catch (error) {
      console.error('❌ Failed to get latest credit score:', error);
      res.status(500).json({ 
        error: 'Failed to fetch credit score',
        code: 'SCORE_FETCH_FAILED'
      });
    }
  }
);

// Get credit score history
router.get('/history',
  [
    queryValidator('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
  ],
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const limit = parseInt(req.query.limit as string) || 12;
      const history = await CreditScoreModel.getHistory(req.user.userId, limit);

      res.json({
        history: history.map(score => ({
          score: score.score,
          confidence: score.confidence,
          trend: score.trend,
          date: score.date
        }))
      });

    } catch (error) {
      console.error('❌ Failed to get score history:', error);
      res.status(500).json({ 
        error: 'Failed to fetch score history',
        code: 'SCORE_HISTORY_FAILED'
      });
    }
  }
);

// Get detailed score breakdown and explanation
router.get('/breakdown',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const breakdown = await explanationService.getScoreBreakdown(req.user.userId);

      res.json(breakdown);

    } catch (error) {
      console.error('❌ Failed to get score breakdown:', error);
      
      if (error instanceof Error && error.message.includes('No credit score found')) {
        return res.status(404).json({
          error: 'No credit score found',
          code: 'SCORE_NOT_FOUND',
          message: 'Please calculate your credit score first'
        });
      }

      res.status(500).json({ 
        error: 'Failed to fetch score breakdown',
        code: 'SCORE_BREAKDOWN_FAILED'
      });
    }
  }
);

// Get score comparison with peers
router.get('/comparison',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const comparison = await explanationService.getScoreComparison(req.user.userId);

      res.json(comparison);

    } catch (error) {
      console.error('❌ Failed to get score comparison:', error);
      
      if (error instanceof Error && error.message.includes('No score found')) {
        return res.status(404).json({
          error: 'No credit score found',
          code: 'SCORE_NOT_FOUND',
          message: 'Please calculate your credit score first'
        });
      }

      res.status(500).json({ 
        error: 'Failed to fetch score comparison',
        code: 'SCORE_COMPARISON_FAILED'
      });
    }
  }
);

// Recalculate credit score (triggered by new data or user request)
router.post('/recalculate',
  authenticateToken,
  requireKYC,
  requireConsent,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      console.log(`🔄 Recalculating credit score for user ${req.user.userId}`);

      const scoreResult = await scoringService.recalculateScore(req.user.userId);

      res.json({
        message: 'Credit score recalculated successfully',
        score: scoreResult.score,
        confidence: scoreResult.confidence,
        trend: scoreResult.trend,
        factors: scoreResult.factors,
        recommendations: scoreResult.recommendations
      });

    } catch (error) {
      console.error('❌ Failed to recalculate credit score:', error);
      
      if (error instanceof Error && error.message.includes('Insufficient transaction data')) {
        return res.status(400).json({
          error: 'Insufficient transaction data for scoring',
          code: 'INSUFFICIENT_DATA',
          message: 'Please connect more accounts or wait for more transaction history'
        });
      }

      res.status(500).json({ 
        error: 'Failed to recalculate credit score',
        code: 'SCORE_RECALCULATION_FAILED'
      });
    }
  }
);

// Get score factors with detailed explanations
router.get('/factors',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Get latest score
      const latestScore = await CreditScoreModel.findLatestByUserId(req.user.userId);
      if (!latestScore) {
        return res.status(404).json({
          error: 'No credit score found',
          code: 'SCORE_NOT_FOUND',
          message: 'Please calculate your credit score first'
        });
      }

      // Get detailed breakdown for factors
      const breakdown = await explanationService.getScoreBreakdown(req.user.userId);

      res.json({
        factors: breakdown.factors,
        scoreRange: breakdown.scoreRange,
        improvementTips: breakdown.improvementTips
      });

    } catch (error) {
      console.error('❌ Failed to get score factors:', error);
      res.status(500).json({ 
        error: 'Failed to fetch score factors',
        code: 'SCORE_FACTORS_FAILED'
      });
    }
  }
);

// Check if user has sufficient data for scoring
router.get('/data-sufficiency',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const analysis = await dataSufficiencyService.analyzeDataSufficiency(req.user.userId);

      res.json(analysis);

    } catch (error) {
      console.error('❌ Failed to check data sufficiency:', error);
      res.status(500).json({ 
        error: 'Failed to check data sufficiency',
        code: 'DATA_SUFFICIENCY_CHECK_FAILED'
      });
    }
  }
);

// Get improvement recommendations
router.get('/recommendations',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const breakdown = await explanationService.getScoreBreakdown(req.user.userId);

      res.json({
        recommendations: breakdown.improvementTips,
        nextReviewDate: breakdown.nextReviewDate
      });

    } catch (error) {
      console.error('❌ Failed to get recommendations:', error);
      
      if (error instanceof Error && error.message.includes('No credit score found')) {
        return res.status(404).json({
          error: 'No credit score found',
          code: 'SCORE_NOT_FOUND',
          message: 'Please calculate your credit score first'
        });
      }

      res.status(500).json({ 
        error: 'Failed to fetch recommendations',
        code: 'RECOMMENDATIONS_FAILED'
      });
    }
  }
);

// Check if user can proceed with scoring
router.get('/can-proceed',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const eligibility = await dataSufficiencyService.canProceedWithScoring(req.user.userId);

      res.json(eligibility);

    } catch (error) {
      console.error('❌ Failed to check scoring eligibility:', error);
      res.status(500).json({ 
        error: 'Failed to check scoring eligibility',
        code: 'SCORING_ELIGIBILITY_CHECK_FAILED'
      });
    }
  }
);

// Get data improvement suggestions
router.get('/data-improvement',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const suggestions = await dataSufficiencyService.getImprovementSuggestions(req.user.userId);

      res.json(suggestions);

    } catch (error) {
      console.error('❌ Failed to get improvement suggestions:', error);
      res.status(500).json({ 
        error: 'Failed to fetch improvement suggestions',
        code: 'DATA_IMPROVEMENT_SUGGESTIONS_FAILED'
      });
    }
  }
);

export default router;