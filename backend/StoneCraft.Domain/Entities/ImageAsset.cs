using System;

namespace StoneCraft.Domain.Entities;

public class ImageAsset
{
    public Guid Id { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? Alt { get; set; }
    public Guid ProductId { get; set; }
    public Product? Product { get; set; }
}
