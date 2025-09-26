using Microsoft.EntityFrameworkCore;
using StoneCraft.Infrastructure;

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
    ?? "Host=localhost;Port=5432;Database=stonecraft;Username=postgres;Password=postgres";
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString, npgsql => npgsql.MigrationsAssembly("StoneCraft.Infrastructure")));

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

app.MapControllers();

app.Run();
