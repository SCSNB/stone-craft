# Use the official .NET 8.0 SDK image for building
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy and restore the backend
COPY ["backend/StoneCraft.Api/StoneCraft.Api.csproj", "backend/StoneCraft.Api/"]
RUN dotnet restore "backend/StoneCraft.Api/StoneCraft.Api.csproj"

# Copy everything else and build
COPY . .
WORKDIR "/src/backend/StoneCraft.Api"
RUN dotnet publish "StoneCraft.Api.csproj" -c Release -o /app/publish

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

# Copy the published app
COPY --from=build /app/publish .

# Copy the frontend files to wwwroot
COPY frontend/public /app/wwwroot

# Set the entry point
ENTRYPOINT ["dotnet", "StoneCraft.Api.dll"]

# Expose the port the app runs on
EXPOSE 80
EXPOSE 443
