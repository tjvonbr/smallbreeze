import { Injectable, BadRequestException } from '@nestjs/common';
import { prisma } from '../lib/prisma.js';
import {
  isS3Enabled,
  isAllowedContentType,
  getAllowedContentTypes,
  generatePresignedUploadUrl,
  generatePhotoKey,
  getPublicUrl,
  deleteObject,
  objectExists,
} from '../lib/s3.js';
import { randomUUID } from 'crypto';

export interface PresignResult {
  presignedUrl: string;
  s3Key: string;
  expiresIn: number;
}

export interface PhotoWithUrl {
  id: string;
  s3Key: string;
  url: string;
  caption: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PhotosService {
  /**
   * Verify user has access to a listing via team membership.
   * Returns the listing with teamId if found, null otherwise.
   */
  private async verifyListingAccess(listingId: string, userId: string) {
    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });

    const teamIds = teamMemberships.map((tm: { teamId: string }) => tm.teamId);

    const listing = await prisma.listing.findFirst({
      where: {
        id: listingId,
        teamId: { in: teamIds },
      },
      select: { id: true, teamId: true },
    });

    return listing;
  }

  /**
   * Verify user has access to a specific photo via listing team membership.
   */
  private async verifyPhotoAccess(photoId: string, userId: string) {
    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });

    const teamIds = teamMemberships.map((tm: { teamId: string }) => tm.teamId);

    const photo = await prisma.listingPhoto.findFirst({
      where: {
        id: photoId,
        listing: {
          teamId: { in: teamIds },
        },
      },
      include: {
        listing: {
          select: { id: true, teamId: true },
        },
      },
    });

    return photo;
  }

  /**
   * Generate a presigned URL for uploading a photo.
   */
  async getPresignedUploadUrl(
    listingId: string,
    userId: string,
    contentType: string,
  ): Promise<PresignResult | null> {
    if (!isS3Enabled()) {
      throw new BadRequestException('S3 is not configured');
    }

    if (!isAllowedContentType(contentType)) {
      throw new BadRequestException(
        `Invalid content type. Allowed types: ${getAllowedContentTypes().join(', ')}`,
      );
    }

    const listing = await this.verifyListingAccess(listingId, userId);
    if (!listing) {
      return null;
    }

    const fileId = randomUUID();
    const s3Key = generatePhotoKey(listing.teamId, listingId, fileId, contentType);

    const result = await generatePresignedUploadUrl(s3Key, contentType);
    if (!result) {
      throw new BadRequestException('Failed to generate presigned URL');
    }

    return {
      presignedUrl: result.url,
      s3Key,
      expiresIn: result.expiresIn,
    };
  }

  /**
   * Confirm a photo upload and create the database record.
   */
  async confirmUpload(
    listingId: string,
    userId: string,
    s3Key: string,
    caption?: string,
  ): Promise<PhotoWithUrl | null> {
    if (!isS3Enabled()) {
      throw new BadRequestException('S3 is not configured');
    }

    const listing = await this.verifyListingAccess(listingId, userId);
    if (!listing) {
      return null;
    }

    // Verify the S3 key matches the expected pattern for this listing
    const expectedPrefix = `photos/${listing.teamId}/${listingId}/`;
    if (!s3Key.startsWith(expectedPrefix)) {
      throw new BadRequestException('Invalid S3 key for this listing');
    }

    // Verify the object exists in S3
    const exists = await objectExists(s3Key);
    if (!exists) {
      throw new BadRequestException('File not found in S3. Please upload the file first.');
    }

    // Get the next order value
    const maxOrderPhoto = await prisma.listingPhoto.findFirst({
      where: { listingId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = (maxOrderPhoto?.order ?? -1) + 1;

    // Create the photo record
    const photo = await prisma.listingPhoto.create({
      data: {
        listingId,
        s3Key,
        caption: caption || null,
        order: nextOrder,
      },
    });

    return {
      ...photo,
      url: getPublicUrl(photo.s3Key),
    };
  }

  /**
   * Get all photos for a listing.
   */
  async getPhotos(listingId: string, userId: string): Promise<PhotoWithUrl[] | null> {
    const listing = await this.verifyListingAccess(listingId, userId);
    if (!listing) {
      return null;
    }

    const photos = await prisma.listingPhoto.findMany({
      where: { listingId },
      orderBy: { order: 'asc' },
    });

    return photos.map((photo) => ({
      ...photo,
      url: getPublicUrl(photo.s3Key),
    }));
  }

  /**
   * Update a photo's caption.
   */
  async updatePhoto(
    photoId: string,
    userId: string,
    caption?: string,
  ): Promise<PhotoWithUrl | null> {
    const photo = await this.verifyPhotoAccess(photoId, userId);
    if (!photo) {
      return null;
    }

    const updatedPhoto = await prisma.listingPhoto.update({
      where: { id: photoId },
      data: { caption: caption ?? null },
    });

    return {
      ...updatedPhoto,
      url: getPublicUrl(updatedPhoto.s3Key),
    };
  }

  /**
   * Reorder photos for a listing.
   */
  async reorderPhotos(
    listingId: string,
    userId: string,
    photoIds: string[],
  ): Promise<PhotoWithUrl[] | null> {
    const listing = await this.verifyListingAccess(listingId, userId);
    if (!listing) {
      return null;
    }

    // Verify all photo IDs belong to this listing
    const existingPhotos = await prisma.listingPhoto.findMany({
      where: { listingId },
      select: { id: true },
    });
    const existingIds = new Set(existingPhotos.map((p) => p.id));

    for (const id of photoIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(`Photo ${id} does not belong to this listing`);
      }
    }

    // Update order for each photo
    await Promise.all(
      photoIds.map((id, index) =>
        prisma.listingPhoto.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    // Return updated photos
    const photos = await prisma.listingPhoto.findMany({
      where: { listingId },
      orderBy: { order: 'asc' },
    });

    return photos.map((photo) => ({
      ...photo,
      url: getPublicUrl(photo.s3Key),
    }));
  }

  /**
   * Delete a photo.
   */
  async deletePhoto(photoId: string, userId: string): Promise<boolean> {
    const photo = await this.verifyPhotoAccess(photoId, userId);
    if (!photo) {
      return false;
    }

    // Delete from S3
    await deleteObject(photo.s3Key);

    // Delete from database
    await prisma.listingPhoto.delete({
      where: { id: photoId },
    });

    // Reorder remaining photos
    const remainingPhotos = await prisma.listingPhoto.findMany({
      where: { listingId: photo.listingId },
      orderBy: { order: 'asc' },
      select: { id: true },
    });

    await Promise.all(
      remainingPhotos.map((p, index) =>
        prisma.listingPhoto.update({
          where: { id: p.id },
          data: { order: index },
        }),
      ),
    );

    return true;
  }
}
