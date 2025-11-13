import { Router, Request, Response } from 'express';
import { ServiceRegistry } from '@car-finder/services';
import { ChatRequest, ChatResponse } from '@car-finder/types';
import { AIService } from '../services/AIService';

const router: Router = Router();

// POST /api/ai/chat - Generate AI chat response for communication assistant
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const chatRequest: ChatRequest = req.body;

    // Validate request body
    if (!chatRequest.context || !chatRequest.conversationHistory || !chatRequest.userMessage) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Missing required fields: context, conversationHistory, or userMessage'
      });
    }

    // Validate context structure
    if (!chatRequest.context.view || !['dashboard', 'detail'].includes(chatRequest.context.view)) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Invalid context.view - must be "dashboard" or "detail"'
      });
    }

    // If vehicleId is provided in context, fetch vehicle data
    let vehicleData = undefined;

    if (chatRequest.context.vehicleId) {
      const vehicleRepository = await ServiceRegistry.getVehicleRepository();
      vehicleData = await vehicleRepository.findVehicleById(chatRequest.context.vehicleId);

      if (!vehicleData) {
        return res.status(404).json({
          error: 'Vehicle not found',
          message: `No vehicle found with ID: ${chatRequest.context.vehicleId}`
        });
      }
    }

    // Create AIService instance
    const aiService = new AIService();

    // Generate chat response
    const aiResponse = await aiService.chat(
      chatRequest.context,
      chatRequest.conversationHistory,
      chatRequest.userMessage,
      vehicleData
    );

    // Return response
    const response: ChatResponse = {
      aiResponse,
    };

    res.json(response);
  } catch (error) {
    console.error('Error generating AI chat response:', error);

    // Check if it's a known error type
    if (error instanceof Error) {
      // Check for specific error messages
      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'AI service rate limit exceeded. Please try again later.'
        });
      }

      if (error.message.includes('validation') || error.message.includes('invalid')) {
        return res.status(400).json({
          error: 'Bad request',
          message: error.message
        });
      }
    }

    // Default error response
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate AI chat response'
    });
  }
});

export default router;
