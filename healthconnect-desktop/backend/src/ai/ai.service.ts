import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly openaiApiKey: string;
  private readonly openaiBaseUrl = 'https://api.openai.com/v1';

  constructor(private readonly configService: ConfigService) {
    this.openaiApiKey = this.configService.get<string>('integrations.openaiApiKey', '');
  }

  /**
   * Generate call summary from transcript using OpenAI
   */
  async generateCallSummary(transcript: string, consultationData: {
    chiefComplaint?: string;
    patientName: string;
    doctorName: string;
    duration: number;
  }): Promise<{
    summary: string;
    diagnosis?: string;
    treatmentPlan?: string;
    keyPoints: string[];
  }> {
    if (!this.openaiApiKey) {
      this.logger.warn('OpenAI API key not configured, returning basic summary');
      return {
        summary: this.generateBasicSummary(consultationData, transcript),
        keyPoints: [],
      };
    }

    try {
      const prompt = `You are a medical AI assistant. Generate a professional consultation summary from the following transcript.

Patient: ${consultationData.patientName}
Doctor: ${consultationData.doctorName}
Chief Complaint: ${consultationData.chiefComplaint || 'Not specified'}
Call Duration: ${consultationData.duration} seconds

Transcript:
${transcript}

Please provide:
1. A concise summary of the consultation
2. Diagnosis (if mentioned)
3. Treatment plan (if mentioned)
4. Key points discussed

Format as JSON with keys: summary, diagnosis, treatmentPlan, keyPoints (array of strings).`;

      const response = await fetch(`${this.openaiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Using cheaper model for cost efficiency
          messages: [
            {
              role: 'system',
              content: 'You are a medical AI assistant that generates professional consultation summaries. Always respond with valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = JSON.parse(data.choices[0].message.content);

      return {
        summary: content.summary || this.generateBasicSummary(consultationData, transcript),
        diagnosis: content.diagnosis,
        treatmentPlan: content.treatmentPlan,
        keyPoints: content.keyPoints || [],
      };
    } catch (error) {
      this.logger.error('Failed to generate AI summary', error);
      return {
        summary: this.generateBasicSummary(consultationData, transcript),
        keyPoints: [],
      };
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper API
   */
  async transcribeAudio(audioBuffer: Buffer, language?: string): Promise<string> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: 'audio/webm' });
      formData.append('file', blob, 'recording.webm');
      formData.append('model', 'whisper-1');
      if (language) {
        formData.append('language', language);
      }

      const response = await fetch(`${this.openaiBaseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OpenAI Whisper API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      this.logger.error('Failed to transcribe audio', error);
      throw error;
    }
  }

  private generateBasicSummary(
    consultationData: { patientName: string; doctorName: string; duration: number },
    transcript: string,
  ): string {
    return `Consultation between ${consultationData.patientName} and Dr. ${consultationData.doctorName}.\nDuration: ${Math.floor(consultationData.duration / 60)} minutes.\n\n${transcript.substring(0, 500)}${transcript.length > 500 ? '...' : ''}`;
  }
}

