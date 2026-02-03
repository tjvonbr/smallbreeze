import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import { PhotosService } from './photos.service.js';

interface PresignDto {
  contentType: string;
}

interface ConfirmDto {
  s3Key: string;
  caption?: string;
}

interface UpdatePhotoDto {
  caption?: string;
}

interface ReorderDto {
  photoIds: string[];
}

@Controller('api/listings/:listingId/photos')
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Post('presign')
  async getPresignedUrl(
    @Param('listingId') listingId: string,
    @Body() body: PresignDto,
    @Session() session: { user?: { id: string } } | null,
  ) {
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const result = await this.photosService.getPresignedUploadUrl(
      listingId,
      session.user.id,
      body.contentType,
    );

    if (!result) {
      throw new NotFoundException('Listing not found');
    }

    return result;
  }

  @Post('confirm')
  async confirmUpload(
    @Param('listingId') listingId: string,
    @Body() body: ConfirmDto,
    @Session() session: { user?: { id: string } } | null,
  ) {
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const photo = await this.photosService.confirmUpload(
      listingId,
      session.user.id,
      body.s3Key,
      body.caption,
    );

    if (!photo) {
      throw new NotFoundException('Listing not found');
    }

    return { photo };
  }

  @Get()
  async getPhotos(
    @Param('listingId') listingId: string,
    @Session() session: { user?: { id: string } } | null,
  ) {
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const photos = await this.photosService.getPhotos(listingId, session.user.id);

    if (!photos) {
      throw new NotFoundException('Listing not found');
    }

    return { photos };
  }

  @Patch('reorder')
  async reorderPhotos(
    @Param('listingId') listingId: string,
    @Body() body: ReorderDto,
    @Session() session: { user?: { id: string } } | null,
  ) {
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const photos = await this.photosService.reorderPhotos(
      listingId,
      session.user.id,
      body.photoIds,
    );

    if (!photos) {
      throw new NotFoundException('Listing not found');
    }

    return { photos };
  }

  @Patch(':photoId')
  async updatePhoto(
    @Param('photoId') photoId: string,
    @Body() body: UpdatePhotoDto,
    @Session() session: { user?: { id: string } } | null,
  ) {
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const photo = await this.photosService.updatePhoto(
      photoId,
      session.user.id,
      body.caption,
    );

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    return { photo };
  }

  @Delete(':photoId')
  async deletePhoto(
    @Param('photoId') photoId: string,
    @Session() session: { user?: { id: string } } | null,
  ) {
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const deleted = await this.photosService.deletePhoto(photoId, session.user.id);

    if (!deleted) {
      throw new NotFoundException('Photo not found');
    }

    return { success: true };
  }
}
