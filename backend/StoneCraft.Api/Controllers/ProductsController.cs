using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StoneCraft.Domain.Entities;
using StoneCraft.Infrastructure;
using StoneCraft.Domain.Enums;
using Microsoft.AspNetCore.Authorization;

namespace StoneCraft.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public ProductsController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Product>>> GetAll([FromQuery] int? category)
    {
        var query = _db.Products
            .Include(p => p.Images)
            .AsQueryable();

        if (category.HasValue && Enum.IsDefined(typeof(CategoryType), category.Value))
        {
            var cat = (CategoryType)category.Value;
            query = query.Where(p => p.Category == cat);
        }

        var products = await query
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();
        return Ok(products);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Product>> GetById(Guid id)
    {
        var product = await _db.Products
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.Id == id);
        if (product == null) return NotFound();
        return Ok(product);
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<Product>> Create(Product input)
    {
        input.Id = Guid.NewGuid();
        input.CreatedAt = DateTime.UtcNow;
        _db.Products.Add(input);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = input.Id }, input);
    }

    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> Update(Guid id, Product input)
    {
        var product = await _db.Products.FindAsync(id);
        if (product == null) return NotFound();

        product.Name = input.Name;
        product.Description = input.Description;
        product.Price = input.Price;
        product.Category = input.Category;
        product.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> Delete(Guid id)
    {
        var product = await _db.Products.FindAsync(id);
        if (product == null) return NotFound();
        _db.Products.Remove(product);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
