# Build stage for .NET
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj and restore as distinct layers
COPY ["backend/StoneCraft.Api/StoneCraft.Api.csproj", "backend/StoneCraft.Api/"]
RUN dotnet restore "backend/StoneCraft.Api/StoneCraft.Api.csproj"

# Copy everything else and build
COPY . .
WORKDIR "/src/backend/StoneCraft.Api"
RUN dotnet build "StoneCraft.Api.csproj" -c Release -o /app/build

# Publish the app
FROM build AS publish
RUN dotnet publish "StoneCraft.Api.csproj" -c Release -o /app/publish \
    --no-restore \
    --no-build

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Install required runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgdiplus \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy the published app
COPY --from=publish /app/publish .

# Copy the frontend files to wwwroot
COPY frontend/public /app/wwwroot

# Set environment variables
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:80
ENV DOTNET_CLI_TELEMETRY_OPTOUT=1
ENV DOTNET_NOLOGO=true

# Cloudinary configuration
ENV CLOUDINARY__CloudName=${CLOUDINARY_CLOUD_NAME}
ENV CLOUDINARY__ApiKey=${CLOUDINARY_API_KEY}
ENV CLOUDINARY__ApiSecret=${CLOUDINARY_API_SECRET}

# Database configuration
ENV ConnectionStrings__DefaultConnection="${SUPABASE_CONNECTION_STRING}"
ENV DB_PASSWORD="${SUPABASE_DB_PASSWORD}"

# Create a non-root user and switch to it
RUN adduser --disabled-password --home /app --gecos '' appuser && chown -R appuser /app
USER appuser

EXPOSE 80
EXPOSE 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

ENTRYPOINT ["dotnet", "StoneCraft.Api.dll"]
