/**
 * Campaign Types
 * Tipos para campanhas e marketing
 */

export type CampaignType = 'nps' | 'promotional' | 'notification';
export type CampaignChannel = 'email' | 'whatsapp' | 'sms';
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'cancelled';
export type CTAType = 'link' | 'phone' | 'email' | 'button';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: CampaignType;
  channels: CampaignChannel[];
  segment?: string;
  status: CampaignStatus;
  scheduled_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface CampaignFormData {
  name: string;
  description: string;
  type: CampaignType;
  channels: CampaignChannel[];
  segment?: string;
  status: CampaignStatus;
  scheduledAt?: string;
  content?: string;
  subject?: string;
  ctaType?: CTAType;
  ctaValue?: string;
}

export interface CampaignStats {
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_conversions: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  conversion_rate: number;
}
