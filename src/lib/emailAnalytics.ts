import { prisma } from './prisma';

export interface DeliveryTracking {
  messageId: string;
  to: string;
  subject: string;
  template: string;
  timestamp: Date;
}

export interface EmailStats {
  sent: number;
  delivered: number;
  bounced: number;
  opened: number;
  clicked: number;
}

export interface EngagementMetrics {
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
}

export class EmailAnalytics {
  /**
   * Track email delivery
   */
  async trackDelivery(tracking: DeliveryTracking): Promise<void> {
    try {
      await prisma.emailLog.create({
        data: {
          messageId: tracking.messageId,
          recipient: tracking.to,
          subject: tracking.subject,
          template: tracking.template,
          sentAt: tracking.timestamp,
          status: 'sent'
        }
      });
    } catch (error) {
      console.error('Failed to track email delivery:', error);
    }
  }

  /**
   * Track email open
   */
  async trackOpen(messageId: string, userAgent?: string, ipAddress?: string): Promise<void> {
    try {
      await prisma.emailLog.update({
        where: { messageId },
        data: {
          status: 'opened',
          openedAt: new Date(),
          userAgent,
          ipAddress
        }
      });

      // Create engagement record
      await prisma.emailEngagement.create({
        data: {
          messageId,
          eventType: 'open',
          timestamp: new Date(),
          userAgent,
          ipAddress
        }
      });
    } catch (error) {
      console.error('Failed to track email open:', error);
    }
  }

  /**
   * Track email click
   */
  async trackClick(messageId: string, url: string, userAgent?: string, ipAddress?: string): Promise<void> {
    try {
      await prisma.emailLog.update({
        where: { messageId },
        data: {
          status: 'clicked',
          clickedAt: new Date()
        }
      });

      // Create engagement record
      await prisma.emailEngagement.create({
        data: {
          messageId,
          eventType: 'click',
          url,
          timestamp: new Date(),
          userAgent,
          ipAddress
        }
      });
    } catch (error) {
      console.error('Failed to track email click:', error);
    }
  }

  /**
   * Track email bounce
   */
  async trackBounce(messageId: string, bounceType: 'hard' | 'soft', reason?: string): Promise<void> {
    try {
      await prisma.emailLog.update({
        where: { messageId },
        data: {
          status: 'bounced',
          bouncedAt: new Date(),
          bounceType,
          bounceReason: reason
        }
      });

      // Create engagement record
      await prisma.emailEngagement.create({
        data: {
          messageId,
          eventType: 'bounce',
          details: { bounceType, reason },
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to track email bounce:', error);
    }
  }

  /**
   * Track email unsubscribe
   */
  async trackUnsubscribe(messageId: string, reason?: string): Promise<void> {
    try {
      await prisma.emailLog.update({
        where: { messageId },
        data: {
          status: 'unsubscribed',
          unsubscribedAt: new Date()
        }
      });

      // Create engagement record
      await prisma.emailEngagement.create({
        data: {
          messageId,
          eventType: 'unsubscribe',
          details: { reason },
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to track email unsubscribe:', error);
    }
  }

  /**
   * Get delivery statistics
   */
  async getDeliveryStats(timeframe: '24h' | '7d' | '30d' = '24h'): Promise<EmailStats> {
    const hours = timeframe === '24h' ? 24 : timeframe === '7d' ? 168 : 720;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [sent, delivered, bounced, opened, clicked] = await Promise.all([
      prisma.emailLog.count({ where: { sentAt: { gte: since } } }),
      prisma.emailLog.count({ where: { status: 'delivered', sentAt: { gte: since } } }),
      prisma.emailLog.count({ where: { status: 'bounced', sentAt: { gte: since } } }),
      prisma.emailLog.count({ where: { status: 'opened', sentAt: { gte: since } } }),
      prisma.emailLog.count({ where: { status: 'clicked', sentAt: { gte: since } } })
    ]);

    return { sent, delivered, bounced, opened, clicked };
  }

  /**
   * Get engagement metrics
   */
  async getEngagementMetrics(timeframe: '24h' | '7d' | '30d' = '24h'): Promise<EngagementMetrics> {
    const hours = timeframe === '24h' ? 24 : timeframe === '7d' ? 168 : 720;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [totalSent, totalOpened, totalClicked, totalBounced, totalUnsubscribed] = await Promise.all([
      prisma.emailLog.count({ where: { sentAt: { gte: since } } }),
      prisma.emailLog.count({ where: { status: 'opened', sentAt: { gte: since } } }),
      prisma.emailLog.count({ where: { status: 'clicked', sentAt: { gte: since } } }),
      prisma.emailLog.count({ where: { status: 'bounced', sentAt: { gte: since } } }),
      prisma.emailLog.count({ where: { status: 'unsubscribed', sentAt: { gte: since } } })
    ]);

    return {
      openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
      clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
      bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
      unsubscribeRate: totalSent > 0 ? (totalUnsubscribed / totalSent) * 100 : 0
    };
  }

  /**
   * Get template performance
   */
  async getTemplatePerformance(template: string, timeframe: '24h' | '7d' | '30d' = '24h'): Promise<{
    template: string;
    sent: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
  }> {
    const hours = timeframe === '24h' ? 24 : timeframe === '7d' ? 168 : 720;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [sent, opened, clicked, bounced] = await Promise.all([
      prisma.emailLog.count({ where: { template, sentAt: { gte: since } } }),
      prisma.emailLog.count({ where: { template, status: 'opened', sentAt: { gte: since } } }),
      prisma.emailLog.count({ where: { template, status: 'clicked', sentAt: { gte: since } } }),
      prisma.emailLog.count({ where: { template, status: 'bounced', sentAt: { gte: since } } })
    ]);

    return {
      template,
      sent,
      openRate: sent > 0 ? (opened / sent) * 100 : 0,
      clickRate: sent > 0 ? (clicked / sent) * 100 : 0,
      bounceRate: sent > 0 ? (bounced / sent) * 100 : 0
    };
  }

  /**
   * Get top performing templates
   */
  async getTopTemplates(limit: number = 10, timeframe: '24h' | '7d' | '30d' = '24h'): Promise<Array<{
    template: string;
    sent: number;
    openRate: number;
    clickRate: number;
  }>> {
    const hours = timeframe === '24h' ? 24 : timeframe === '7d' ? 168 : 720;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const templates = await prisma.emailLog.groupBy({
      by: ['template'],
      where: { sentAt: { gte: since } },
      _count: { template: true },
      _avg: {
        // We'll calculate rates manually
      }
    });

    const templateStats = await Promise.all(
      templates.map(async (template) => {
        const [sent, opened, clicked] = await Promise.all([
          prisma.emailLog.count({ where: { template: template.template, sentAt: { gte: since } } }),
          prisma.emailLog.count({ where: { template: template.template, status: 'opened', sentAt: { gte: since } } }),
          prisma.emailLog.count({ where: { template: template.template, status: 'clicked', sentAt: { gte: since } } })
        ]);

        return {
          template: template.template,
          sent,
          openRate: sent > 0 ? (opened / sent) * 100 : 0,
          clickRate: sent > 0 ? (clicked / sent) * 100 : 0
        };
      })
    );

    return templateStats
      .sort((a, b) => b.openRate - a.openRate)
      .slice(0, limit);
  }

  /**
   * Get email health score
   */
  async getEmailHealthScore(): Promise<{
    score: number;
    factors: {
      deliveryRate: number;
      openRate: number;
      bounceRate: number;
      unsubscribeRate: number;
    };
  }> {
    const stats = await this.getEngagementMetrics('7d');
    
    // Calculate health score (0-100)
    const deliveryRate = 100 - stats.bounceRate;
    const engagementScore = (stats.openRate + stats.clickRate) / 2;
    const retentionScore = 100 - stats.unsubscribeRate;
    
    const score = Math.round((deliveryRate + engagementScore + retentionScore) / 3);

    return {
      score: Math.max(0, Math.min(100, score)),
      factors: {
        deliveryRate,
        openRate: stats.openRate,
        bounceRate: stats.bounceRate,
        unsubscribeRate: stats.unsubscribeRate
      }
    };
  }
}
