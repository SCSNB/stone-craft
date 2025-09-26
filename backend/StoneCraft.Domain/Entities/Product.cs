using System;
using System.Collections.Generic;
using StoneCraft.Domain.Enums;

namespace StoneCraft.Domain.Entities;

public class Product
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public CategoryType Category { get; set; }
    public List<ImageAsset> Images { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
