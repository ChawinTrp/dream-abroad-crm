import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Client, validateSignature, WebhookEvent } from '@line/bot-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';

// Pleasant default colors for new customers (matches mockup palette)
const AVATAR_COLORS = [
  '#7C6FE0', '#3FA98A', '#E08A5C', '#E5A23B', '#94A3B8',
];

function pickColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'LN';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private client: Client | null = null;
  private channelSecret: string;

  constructor(
    private prisma: PrismaService,
    private messages: MessagesService,
  ) {
    this.channelSecret = process.env.LINE_CHANNEL_SECRET ?? '';
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? '';
    if (this.channelSecret && token && !token.startsWith('mock')) {
      this.client = new Client({
        channelSecret: this.channelSecret,
        channelAccessToken: token,
      });
      this.logger.log('LINE client initialized with real credentials');
    } else {
      this.logger.warn(
        'LINE running in MOCK mode — set LINE_CHANNEL_SECRET and LINE_CHANNEL_ACCESS_TOKEN for real integration',
      );
    }
  }

  verifySignature(rawBody: Buffer, signature: string): void {
    // Skip verification in mock mode (no real secret)
    if (!this.channelSecret || this.channelSecret.startsWith('mock')) return;

    if (!signature) {
      throw new BadRequestException('Missing X-Line-Signature header');
    }
    const valid = validateSignature(rawBody, this.channelSecret, signature);
    if (!valid) {
      this.logger.warn('Invalid LINE signature received');
      throw new UnauthorizedException('Invalid LINE signature');
    }
  }

  async handleWebhook(body: { events?: WebhookEvent[] }) {
    const events = body.events ?? [];
    const results = [];

    for (const event of events) {
      try {
        const result = await this.handleEvent(event);
        if (result) results.push(result);
      } catch (e: any) {
        this.logger.error(`Failed to handle event ${event.type}: ${e.message}`);
      }
    }

    return { processed: results.length };
  }

  private async handleEvent(event: WebhookEvent) {
    switch (event.type) {
      case 'message':
        return this.handleMessageEvent(event);
      case 'follow':
        return this.handleFollowEvent(event);
      case 'unfollow':
        this.logger.log(`User unfollowed: ${event.source.userId}`);
        return null;
      default:
        this.logger.debug(`Ignored event type: ${event.type}`);
        return null;
    }
  }

  private async handleMessageEvent(event: any) {
    if (event.message?.type !== 'text') {
      this.logger.debug(`Skipping non-text message: ${event.message?.type}`);
      return null;
    }

    const lineUserId = event.source?.userId;
    if (!lineUserId) return null;

    const customer = await this.findOrCreateCustomer(lineUserId);

    return this.messages.createInbound({
      customerId: customer.id,
      body: event.message.text,
      lineMessageId: event.message.id,
    });
  }

  private async handleFollowEvent(event: any) {
    const lineUserId = event.source?.userId;
    if (!lineUserId) return null;

    await this.findOrCreateCustomer(lineUserId);
    this.logger.log(`New LINE follower: ${lineUserId}`);
    return null;
  }

  private async findOrCreateCustomer(lineUserId: string) {
    let customer = await this.prisma.customer.findUnique({
      where: { lineUserId },
    });
    if (customer) return customer;

    const leadStage = await this.prisma.stageDefinition.findFirstOrThrow({
      where: { key: 'lead' },
    });

    // Fetch profile from LINE
    let displayName = `LINE user ${lineUserId.slice(-4)}`;
    let pictureUrl: string | null = null;

    if (this.client) {
      try {
        const profile = await this.client.getProfile(lineUserId);
        displayName = profile.displayName || displayName;
        pictureUrl = profile.pictureUrl ?? null;
      } catch (e: any) {
        this.logger.warn(`Failed to fetch LINE profile: ${e.message}`);
      }
    }

    customer = await this.prisma.customer.create({
      data: {
        lineUserId,
        displayName,
        initials: initialsFrom(displayName),
        avatarColor: pickColor(lineUserId),
        pictureUrl,
        stageId: leadStage.id,
        followedAt: new Date(),
      },
    });

    this.logger.log(`Created customer from LINE: ${displayName} (${lineUserId})`);
    return customer;
  }
}
