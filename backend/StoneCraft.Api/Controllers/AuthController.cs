using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace StoneCraft.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IConfiguration _config;

    public AuthController(IConfiguration config)
    {
        _config = config;
    }

    public record LoginRequest(string Username, string Password);

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req?.Username) || string.IsNullOrWhiteSpace(req?.Password))
        {
            return BadRequest("Missing credentials");
        }

        var adminUser = _config["Admin:Username"] ?? "admin";
        var adminPass = _config["Admin:Password"] ?? "admin123";

        if (!string.Equals(req.Username, adminUser, StringComparison.Ordinal) ||
            !string.Equals(req.Password, adminPass, StringComparison.Ordinal))
        {
            return Unauthorized();
        }

        var jwtSection = _config.GetSection("Jwt");
        var issuer = jwtSection["Issuer"] ?? "StoneCraft";
        var audience = jwtSection["Audience"] ?? "StoneCraft";
        var secret = jwtSection["Secret"] ?? "dev_secret_change_me";

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, req.Username),
            new Claim(ClaimTypes.Role, "Admin")
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(4),
            signingCredentials: creds
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        return Ok(new { token = tokenString });
    }
}
