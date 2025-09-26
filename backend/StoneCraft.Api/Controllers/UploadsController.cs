using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StoneCraft.Infrastructure;
using StoneCraft.Domain.Entities;

namespace StoneCraft.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UploadsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<UploadsController> _logger;

    public UploadsController(ApplicationDbContext context, IWebHostEnvironment environment, ILogger<UploadsController> logger)
    {
        _context = context;
        _environment = environment;
        _logger = logger;
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

            // Създаване на папка за снимки ако не съществува
            var uploadsPath = Path.Combine(_environment.WebRootPath ?? "wwwroot", "uploads");
            if (!Directory.Exists(uploadsPath))
            {
                Directory.CreateDirectory(uploadsPath);
            }

            // Генериране на уникално име на файла
            var fileName = $"{Guid.NewGuid()}{fileExtension}";
            var filePath = Path.Combine(uploadsPath, fileName);

            // Запазване на файла
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await File.CopyToAsync(stream);
            }

            // Създаване на ImageAsset запис в базата
            var imageAsset = new ImageAsset
            {
                ProductId = productId,
                Url = $"/uploads/{fileName}",
                Alt = product.Name
            };

            _context.ImageAssets.Add(imageAsset);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Успешно качена снимка {FileName} за продукт {ProductId}", fileName, productId);

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

            // Delete file from filesystem
            var filePath = Path.Combine(_environment.WebRootPath ?? "wwwroot", "uploads", Path.GetFileName(imageAsset.Url));
            if (System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
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
