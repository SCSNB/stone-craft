using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StoneCraft.Api.Settings;
using System;
using System.IO;
using System.Threading.Tasks;

namespace StoneCraft.Api.Services
{
    public class CloudinaryService : ICloudinaryService
    {
        private readonly Cloudinary _cloudinary;
        private readonly ILogger<CloudinaryService> _logger;

        public CloudinaryService(IOptions<CloudinarySettings> config, ILogger<CloudinaryService> logger)
        {
            var account = new Account(
                config.Value.CloudName,
                config.Value.ApiKey,
                config.Value.ApiSecret);

            _cloudinary = new Cloudinary(account);
            _logger = logger;
        }

        public async Task<string> UploadImageAsync(IFormFile file)
        {
            try
            {
                await using var stream = file.OpenReadStream();
                
                var uploadParams = new ImageUploadParams
                {
                    File = new FileDescription(file.FileName, stream),
                    Folder = "stonecraft",
                    UseFilename = true,
                    UniqueFilename = true,
                    Overwrite = false,
                    // ResourceType is set automatically based on the file type
                    Transformation = new Transformation()
                        .Quality("auto")
                        .FetchFormat("auto")
                };

                // Ensure the stream is at the beginning
                stream.Position = 0;

                var uploadResult = await _cloudinary.UploadAsync(uploadParams);

                if (uploadResult.Error != null)
                {
                    _logger.LogError("Cloudinary upload error: {Error}", uploadResult.Error.Message);
                    throw new Exception($"Cloudinary upload failed: {uploadResult.Error.Message}");
                }

                return uploadResult.SecureUrl.AbsoluteUri;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading image to Cloudinary");
                throw;
            }
        }

        public async Task<bool> DeleteImageAsync(string publicId)
        {
            try
            {
                if (string.IsNullOrEmpty(publicId))
                    return false;

                // Remove any URL-encoded characters from the public ID
                publicId = Uri.UnescapeDataString(publicId);
                
                // Remove the file extension if it exists
                publicId = Path.GetFileNameWithoutExtension(publicId);

                _logger.LogInformation("Deleting image with public ID: {PublicId}", publicId);
                
                var deleteParams = new DeletionParams(publicId)
                {
                    ResourceType = ResourceType.Image
                };

                var result = await _cloudinary.DestroyAsync(deleteParams);
                
                _logger.LogInformation("Cloudinary delete result: {Result}", result.Result);
                
                return result.Result == "ok" || result.Result == "not found";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting image with public ID: {PublicId}", publicId);
                return false;
            }
        }
    }
}
