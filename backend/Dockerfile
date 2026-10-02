FROM golang:1.22-alpine AS builder
WORKDIR /app

# Install git (needed for go get)
RUN apk add --no-cache git

# Copy go.mod only, download deps first (better caching)
COPY go.mod .
RUN go mod download -x 2>&1 | tail -5 || true

# Copy source and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GONOSUMDB="*" GOFLAGS="-mod=mod" \
    go build -o flash-poll-server ./cmd/server

FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /root/
COPY --from=builder /app/flash-poll-server .
EXPOSE 8080
CMD ["./flash-poll-server"]
