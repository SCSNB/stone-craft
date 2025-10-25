using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StoneCraft.Infrastructure;
using StoneCraft.Domain.Entities;
using StoneCraft.Api.Services;
using Microsoft.Extensions.Options;

namespace StoneCraft.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UploadsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<UploadsController> _logger;
    private readonly ICloudinaryService _cloudinaryService;

    public UploadsController(
        ApplicationDbContext context, 
        IWebHostEnvironment environment, 
        ILogger<UploadsController> logger,
        ICloudinaryService cloudinaryService)
    {
        _context = context;
        _environment = environment;
        _logger = logger;
        _cloudinaryService = cloudinaryService;
    }

    [HttpPost]
    public async Task<IActionResult> UploadImage([FromForm] IFormFile File, [FromForm] string ProductId)
    {
        try
        {
            if (File == null || File.Length == 0)
            {
                return BadRequest("Няма избран файл");
            }

            if (!Guid.TryParse(ProductId, out var productId))
            {
                return BadRequest("Невалиден ProductId");
            }

            // Проверка дали продуктът съществува
            var product = await _context.Products.FindAsync(productId);
            if (product == null)
            {
                return NotFound("Продуктът не е намерен");
            }

            // Проверка на файловия формат
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
            var fileExtension = Path.GetExtension(File.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(fileExtension))
            {
                return BadRequest("Неподдържан формат на файл. Разрешени са: JPG, PNG, WEBP, GIF");
            }

            // Проверка на размера (максимум 20MB)
            if (File.Length > 20 * 1024 * 1024)
            {
                return BadRequest("Файлът е твърде голям. Максимум 20MB");
            }

            // Качване на снимката в Cloudinary
            var imageUrl = await _cloudinaryService.UploadImageAsync(File);

            // Създаване на ImageAsset запис в базата
            var imageAsset = new ImageAsset
            {
                ProductId = productId,
                Url = imageUrl,
                Alt = product.Name
            };

            _context.ImageAssets.Add(imageAsset);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Успешно качена снимка за продукт {ProductId}", productId);

            return Ok(new { 
                id = imageAsset.Id,
                url = imageAsset.Url,
                message = "Снимката е качена успешно"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Грешка при качване на снимка за продукт {ProductId}", ProductId);
            return StatusCode(500, "Вътрешна грешка на сървъра");
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteImage(Guid id)
    {
        try
        {
            var imageAsset = await _context.ImageAssets.FindAsync(id);
            if (imageAsset == null)
            {
                return NotFound("Снимката не е намерена");
            }

            // Изтриване на снимка от Cloudinary
            // Извличане на public_id от URL-а
            var uri = new Uri(imageAsset.Url);
            var segments = uri.Segments;
            if (segments.Length >= 2)
            {
                // Вземаме предпоследния сегмент (име на папката) и името на файла без разширението
                var folder = segments[^2].Trim('/');
                var fileName = Path.GetFileNameWithoutExtension(segments.Last());
                var publicId = $"{folder}/{fileName}";
                await _cloudinaryService.DeleteImageAsync(publicId);
            }

            // Delete from database
            _context.ImageAssets.Remove(imageAsset);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Успешно изтрита снимка {ImageId}", id);

            return Ok(new { message = "Снимката е изтрита успешно" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Грешка при изтриване на снимка {ImageId}", id);
            return StatusCode(500, "Вътрешна грешка на сървъра");
        }
    }
}
