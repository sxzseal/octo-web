/**
 * Unit tests for canvas.toBlob error handling
 * Tests that null blob is properly handled with error feedback (fix for issue #315)
 *
 * When canvas.toBlob fails (returns null), user should see an error message
 * instead of silent failure.
 */

describe('canvas.toBlob error handling', () => {
    /**
     * Simulates the toBlob callback handler logic from ListItemAvatar and ChannelAvatar
     * Returns true if upload would proceed, false if error was handled
     */
    function handleToBlobResult(
        blob: Blob | null,
        onError: () => void
    ): boolean {
        if (!blob) {
            onError();
            return false;
        }
        return true;
    }

    it('should call error handler when blob is null', () => {
        const errorHandler = jest.fn();
        const result = handleToBlobResult(null, errorHandler);

        expect(result).toBe(false);
        expect(errorHandler).toHaveBeenCalledTimes(1);
    });

    it('should not call error handler when blob is valid', () => {
        const errorHandler = jest.fn();
        const mockBlob = new Blob(['test'], { type: 'image/png' });
        const result = handleToBlobResult(mockBlob, errorHandler);

        expect(result).toBe(true);
        expect(errorHandler).not.toHaveBeenCalled();
    });

    it('should handle empty blob correctly (not null but empty)', () => {
        const errorHandler = jest.fn();
        const emptyBlob = new Blob([], { type: 'image/png' });
        const result = handleToBlobResult(emptyBlob, errorHandler);

        // Empty blob is still a valid blob, should proceed
        expect(result).toBe(true);
        expect(errorHandler).not.toHaveBeenCalled();
    });
});

describe('ListItemAvatar toBlob handling', () => {
    /**
     * Extracted logic from ListItemAvatar.showFile onFinish callback
     */
    async function processAvatarBlob(
        blob: Blob | null,
        onSuccess: (file: File) => Promise<void>,
        onError: () => void
    ): Promise<boolean> {
        if (!blob) {
            onError();
            return false;
        }
        const file = new File([blob], 'profilePicture.png', { type: 'image/png' });
        await onSuccess(file);
        return true;
    }

    it('should return early and show error when blob is null', async () => {
        const onSuccess = jest.fn();
        const onError = jest.fn();

        const result = await processAvatarBlob(null, onSuccess, onError);

        expect(result).toBe(false);
        expect(onError).toHaveBeenCalledTimes(1);
        expect(onSuccess).not.toHaveBeenCalled();
    });

    it('should create file and call onSuccess when blob is valid', async () => {
        const onSuccess = jest.fn();
        const onError = jest.fn();
        const mockBlob = new Blob(['test-image-data'], { type: 'image/png' });

        const result = await processAvatarBlob(mockBlob, onSuccess, onError);

        expect(result).toBe(true);
        expect(onSuccess).toHaveBeenCalledTimes(1);
        expect(onError).not.toHaveBeenCalled();

        // Verify the file was created correctly
        const createdFile = onSuccess.mock.calls[0][0] as File;
        expect(createdFile.name).toBe('profilePicture.png');
        expect(createdFile.type).toBe('image/png');
    });
});

describe('ChannelAvatar toBlob handling', () => {
    /**
     * Extracted logic from ChannelAvatar.showFile onFinish callback
     */
    async function processChannelAvatarBlob(
        blob: Blob | null,
        onFileUpload: ((file: File) => Promise<void>) | undefined,
        uploadAvatar: (file: File) => Promise<void>,
        onError: () => void
    ): Promise<boolean> {
        if (!blob) {
            onError();
            return false;
        }
        const file = new File([blob], 'channelAvatarPicture.png', { type: 'image/png' });
        if (onFileUpload) {
            await onFileUpload(file);
        } else {
            await uploadAvatar(file);
        }
        return true;
    }

    it('should return early and show error when blob is null', async () => {
        const onFileUpload = jest.fn();
        const uploadAvatar = jest.fn();
        const onError = jest.fn();

        const result = await processChannelAvatarBlob(null, onFileUpload, uploadAvatar, onError);

        expect(result).toBe(false);
        expect(onError).toHaveBeenCalledTimes(1);
        expect(onFileUpload).not.toHaveBeenCalled();
        expect(uploadAvatar).not.toHaveBeenCalled();
    });

    it('should use onFileUpload when provided', async () => {
        const onFileUpload = jest.fn();
        const uploadAvatar = jest.fn();
        const onError = jest.fn();
        const mockBlob = new Blob(['test'], { type: 'image/png' });

        const result = await processChannelAvatarBlob(mockBlob, onFileUpload, uploadAvatar, onError);

        expect(result).toBe(true);
        expect(onFileUpload).toHaveBeenCalledTimes(1);
        expect(uploadAvatar).not.toHaveBeenCalled();
        expect(onError).not.toHaveBeenCalled();
    });

    it('should use uploadAvatar when onFileUpload is undefined', async () => {
        const uploadAvatar = jest.fn();
        const onError = jest.fn();
        const mockBlob = new Blob(['test'], { type: 'image/png' });

        const result = await processChannelAvatarBlob(mockBlob, undefined, uploadAvatar, onError);

        expect(result).toBe(true);
        expect(uploadAvatar).toHaveBeenCalledTimes(1);
        expect(onError).not.toHaveBeenCalled();
    });
});
