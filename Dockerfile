# Multi-stage build for CardGames platform
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o cardgames .

# Final stage - use distroless for smaller, more secure image
FROM gcr.io/distroless/static-debian11

# Copy certificates from builder
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Create app directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/cardgames .

# Copy game logic files
COPY --from=builder /app/game_logics ./game_logics/

# Expose port
EXPOSE 8090

# Run the application
CMD ["./cardgames", "serve", "--http=0.0.0.0:8090"]
