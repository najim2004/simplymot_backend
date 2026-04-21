import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export type LatLng = {
  lat: number;
  lng: number;
  outcode?: string;
};

@Injectable()
export class PostCodeMapRepository {
  private readonly logger = new Logger(PostCodeMapRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  normalize(postcode: string) {
    return (postcode || '').trim().toUpperCase().replace(/\s+/g, '');
  }

  async getLatLng(postcode: string): Promise<LatLng> {
    const raw = (postcode || '').trim();
    if (!raw) throw new BadRequestException('Invalid postcode');

    const normalized = this.normalize(raw);

    const cached = await this.prisma.postCodeMap.findUnique({
      where: {
        postcode: normalized,
      },
      select: {
        latitude: true,
        longitude: true,
        outcode: true,
      },
    });

    if (cached) {
      return {
        lat: cached.latitude,
        lng: cached.longitude,
        outcode: cached.outcode ?? undefined,
      };
    }

    let url = `https://api.postcodes.io/postcodes/${encodeURIComponent(raw)}`;
    let response = await fetch(url);

    if (response.status === 404) {
      url = `https://api.postcodes.io/terminated_postcodes/${encodeURIComponent(raw)}`;
      response = await fetch(url);
    }

    if (!response.ok) {
      this.logger.warn(
        `Postcode API failed: ${response.status} ${response.statusText}`,
      );
      throw new BadRequestException('Invalid postcode');
    }

    const data = await response.json();
    const result = data?.result;
    const latitude = result?.latitude;
    const longitude = result?.longitude;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new BadRequestException('Invalid postcode');
    }

    const outcode: string | undefined = result?.outcode ?? undefined;

    await this.prisma.postCodeMap.upsert({
      where: {
        postcode: normalized,
      },
      create: {
        postcode: normalized,
        latitude,
        longitude,
        outcode,
        source: 'postcodes.io',
      },
      update: {
        latitude,
        longitude,
        outcode,
        source: 'postcodes.io',
      },
    });

    return { lat: latitude, lng: longitude, outcode };
  }
}
