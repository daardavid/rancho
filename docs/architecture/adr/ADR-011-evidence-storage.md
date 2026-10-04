# ADR-011: Evidence bytes behind an S3-compatible port

## Status

Proposed

Proposed with physical architecture v0.1. It does not create a bucket, a disk layout, or an upload route.

## Context

Photos, tickets, audio, and other files support a business fact. The fact's owner stores an evidence reference. The bytes are not the weight, the expense, or the count ([cross-cutting-concerns.md](../cross-cutting-concerns.md)). A photo does not upgrade source quality.

The first deployment should accept phone photos and scanned tickets. The herd is small, so the archive is small, and it still must not live only on a laptop disk once the system is deployed. The team does not need to pick a storage company to pick an interface.

## Decision

Hide evidence bytes behind a storage port:

- `put` bytes and technical metadata, return the evidence id
- `get` bytes and technical metadata by that id
- `delete` by that id when a backing is discarded

Rules:

- Development uses a local filesystem adapter. An object-storage emulator is not required to build features.
- Deployed environments use an S3-compatible object store through the same port. No vendor is selected.
- Large binaries do not go in PostgreSQL. The `evidence` schema stores the port's technical row: evidence id, storage key, content type, byte size, and checksum. It does not store kilograms or pesos.
- The association (which record, which kind of backing, who supplied it, when) lives in the owning module's schema, with the fact. The owning module stores the evidence id. It does not store a bucket URL.
- Domain modules depend on the evidence id from the shared kernel, not on the S3 client.
- Upload limits and the allowed content types are security rules ([security-baseline.md](../security-baseline.md)).

The evidence id is the business reference. The storage key is an implementation detail of the adapter.

## Why this split

A filesystem path in a herd row would make production hosting and local development disagree, and would put a disk layout in the domain. A byte column in PostgreSQL would bloat backups of relational data with images and would still need a size policy. An S3-compatible API is implemented by more than one provider, and by a local adapter, so the ranch is not tied to a vendor in order to leave a laptop disk.

A dedicated evidence bounded context is still rejected. The port is technical. The meaning of the file stays on the owning fact.

## Alternatives considered

- **Filesystem only, including production.** Simple until the disk is the server's disk. Backups, redeploys, and a second instance then lose or split the files. Not selected for deployed environments.
- **Store the file in PostgreSQL.** One backup story, and a worse one for large objects. Not selected.
- **Pick a vendor now.** No hosting ADR needs a bucket brand. The port is enough.

## Consequences

- Swapping the deployed provider is an adapter change if the provider speaks the S3 API.
- Losing the file does not invent a second numeric authority. The fact remains the fact. The screen can say the backing is missing.
- A local test can use the filesystem adapter. A test of the S3 adapter can wait until a deployment target exists.
- The port does not interpret image contents. OCR and "read the scale from the photo" are not this decision.

## When to revisit

- The chosen store cannot speak the S3 API and an adapter would be a product of its own.
- File volume or retention needs lifecycle rules the port cannot express as metadata.
- A legal or ranch requirement appears for immutable retention. Ordinary object storage is not a tamper-proof ledger, and this ADR does not create one.

## Status of this document

- Version: 0.1
- Status: Proposed with physical architecture v0.1
- Last updated: 2026-10-04
- Source: cross-cutting evidence rules, `BR-EVID-001`
- Validation: Decision only. No bucket and no upload route
