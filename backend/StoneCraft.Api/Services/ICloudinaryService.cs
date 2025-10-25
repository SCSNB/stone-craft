using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;

namespace StoneCraft.Api.Services
{
    public interface ICloudinaryService
    {
        Task<string> UploadImageAsync(IFormFile file);
        Task<bool> DeleteImageAsync(string publicId);
    }
}
