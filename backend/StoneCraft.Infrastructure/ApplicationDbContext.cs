using Microsoft.EntityFrameworkCore;
using StoneCraft.Domain.Entities;

namespace StoneCraft.Infrastructure;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<Product> Products => Set<Product>();
    public DbSet<ImageAsset> ImageAssets => Set<ImageAsset>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Name).IsRequired().HasMaxLength(200);
            entity.Property(p => p.Price).HasColumnType("numeric(18,2)");
            // Store enum as int by default
            entity.Property(p => p.Category).HasConversion<int>();
            entity.HasMany(p => p.Images)
                  .WithOne(i => i.Product!)
                  .HasForeignKey(i => i.ProductId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ImageAsset>(entity =>
        {
            entity.HasKey(i => i.Id);
            entity.Property(i => i.Url).IsRequired();
        });
    }
}
