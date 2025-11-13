#!/bin/bash

# InForm-V2 Local Deployment Test Script
# This script simulates a production deployment locally for testing

set -e  # Exit on error

echo "=========================================="
echo "InForm-V2 Local Deployment Test"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "ℹ $1"
}

# Check if .env file exists
if [ ! -f .env ]; then
    print_error ".env file not found!"
    print_info "Creating .env from .env.example..."
    cp .env.example .env
    print_warning "Please edit .env with your configuration before continuing"
    exit 1
fi

print_success ".env file found"

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    print_error "Node.js version 20 or higher required. Current: $(node -v)"
    exit 1
fi
print_success "Node.js version check passed: $(node -v)"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    print_error "pnpm not found. Installing..."
    npm install -g pnpm
fi
print_success "pnpm is installed"

# Check if Docker is running
if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker Desktop."
    exit 1
fi
print_success "Docker is running"

echo ""
echo "=========================================="
echo "Step 1: Installing Dependencies"
echo "=========================================="
pnpm install --frozen-lockfile
print_success "Dependencies installed"

echo ""
echo "=========================================="
echo "Step 2: Starting Database Services"
echo "=========================================="
pnpm db:up
sleep 5  # Wait for services to be ready
print_success "Database services started"

echo ""
echo "=========================================="
echo "Step 3: Running Database Migrations"
echo "=========================================="
pnpm prisma migrate deploy
print_success "Migrations completed"

echo ""
echo "=========================================="
echo "Step 4: Seeding Database"
echo "=========================================="
pnpm db:seed
print_success "Database seeded"

echo ""
echo "=========================================="
echo "Step 5: Type Checking"
echo "=========================================="
pnpm typecheck
print_success "Type check passed"

echo ""
echo "=========================================="
echo "Step 6: Linting"
echo "=========================================="
pnpm lint
print_success "Linting passed"

echo ""
echo "=========================================="
echo "Step 7: Building Application"
echo "=========================================="
NODE_ENV=production pnpm build
print_success "Build completed"

echo ""
echo "=========================================="
echo "Step 8: Starting Production Server"
echo "=========================================="
print_info "Starting server on http://localhost:3000"
print_info "Press Ctrl+C to stop the server"
echo ""
print_success "Deployment test completed successfully!"
echo ""
print_info "Default login credentials:"
print_info "  Super Admin: admin@iterate.ai / changeme123"
print_info "  Org Admin: admin@acme.com / password123"
print_info "  Reviewer: reviewer@acme.com / password123"
echo ""

NODE_ENV=production pnpm start
