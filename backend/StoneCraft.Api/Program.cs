using Microsoft.EntityFrameworkCore;
using StoneCraft.Infrastructure;
using StoneCraft.Domain.Entities;
using StoneCraft.Domain.Enums;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
// Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Controllers
builder.Services.AddControllers();

// CORS policy for frontend dev server
const string CorsPolicy = "FrontendDevPolicy";
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicy, policy =>
    {
        policy
            .WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// EF Core DbContext registration (must be before Build)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=localhost;Port=5432;Database=stone_craft;Username=postgres;Password=postgres";
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString, npgsql => npgsql.MigrationsAssembly("StoneCraft.Infrastructure")));

var jwtSection = builder.Configuration.GetSection("Jwt");
var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSection["Secret"] ?? "dev_secret_change_me"));
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSection["Issuer"],
        ValidAudience = jwtSection["Audience"],
        IssuerSigningKey = key,
        ClockSkew = TimeSpan.Zero
    };
});
builder.Services.AddAuthorization();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Static files (for production; wwwroot should contain built frontend)
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseCors(CorsPolicy);

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Seed database with sample data on startup (dev convenience)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    db.Database.Migrate();
    if (!db.Products.Any())
    {
        db.Products.AddRange(
            new Product
            {
                Id = Guid.NewGuid(),
                Name = "Паметник Мрамор М01",
                Description = "Класически модел от мрамор",
                Price = 450.00m,
                Category = CategoryType.Marble,
                CreatedAt = DateTime.UtcNow
            },
            new Product
            {
                Id = Guid.NewGuid(),
                Name = "Паметник Гранит G654",
                Description = "Тъмен гранит, полирана повърхност",
                Price = 780.00m,
                Category = CategoryType.Granite,
                CreatedAt = DateTime.UtcNow
            },
            new Product
            {
                Id = Guid.NewGuid(),
                Name = "Паметник с Триплекс T10",
                Description = "Модерен дизайн с ламинирано стъкло",
                Price = 950.00m,
                Category = CategoryType.Triplex,
                CreatedAt = DateTime.UtcNow
            }
        );
        db.SaveChanges();
    }
}

app.Run();
