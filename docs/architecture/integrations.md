# Integration boundaries

Ports for systems that may one day sit outside the ranch application. No adapter is implemented here. No vendor is selected for the scale, cameras, messaging, or account import. Authentication and evidence storage have physical decisions in [ADR-010](adr/ADR-010-authentication.md) and [ADR-011](adr/ADR-011-evidence-storage.md). Those decisions still sit behind the ports below. A port with no current consumer is still named, so the domain is not later wired straight to a device.

The rule: an integration may produce a domain fact or offer bytes the domain already decided to store. Domain logic depends on the port's normalized fact, never on a vendor API.

## Livestock scale

Today the ranch weighs calves on an electronic IBN ARGON scale. The model and any ports or protocols are unknown (`OQ-SCALE-001`, `CON-SCALE-001`). The working capture is a person writing the reading down.

Future shape, if a protocol is ever confirmed:

```text
scale adapter
    → WeightMeasurement (normalized)
        → Growth application command
            → WeighingSession
```

`WeightMeasurement` means: magnitude, unit, time, source quality measured, and an opaque instrument reference the adapter understands. If the animal is not known automatically, the animal link is still the owner's identification in the session, which matches the chute today (`BR-WEIGH-003`). The domain type does not mention a brand.

Growth does not import a vendor SDK. Until `OQ-SCALE-001` is answered, the port stays unused and the transcribed weight remains the path. That unanswered question blocks the adapter, not the weight record.

## Cameras and other security hardware

No cameras are installed. They are being considered. `PP-SEC-003` is not addressed. `OQ-SEC-001` is open.

Future shape:

```text
perimeter adapter
    → PerimeterObservation (normalized)
        → no domain module in v0.2
```

A normalized observation would say when, which logical point the device claims to cover, and a reference to the stored image or clip. It would not say the whole ranch is watched. It would not mark an animal missing. Herd verification and animal exit stay human decisions in Herd.

There is no Security module waiting to receive this. If the ranch later adopts a device or a manual fence log, a later decision opens a consumer then ([AQ-P2-002](architecture-open-questions.md)). Building the consumer now would pretend `TGT-SEC-002` has a selected implementation.

## Messaging

The live path is human: worker to owner by phone, WhatsApp, photo, or audio, then the owner types a fact (`TGT-COMM-001`). The logical model treats that as capture metadata.

A future messaging port could do one of two different jobs, and they must not be blurred:

- deliver a critical alert to the owner
- ingest a message as a draft the owner still has to turn into a fact

Ingested text is declared data. It does not become a weight or an exit without the owner's capture command. No messaging product is selected ([AQ-P2-004](architecture-open-questions.md)). WhatsApp is the example in the interviews, not the port's type.

## Financial account import

Purchases are often paid by card, payroll often in cash (`BR-PAY-001`). A future import might offer candidate lines from an account statement.

```text
account-statement adapter
    → CandidateCashMovement
        → owner confirms
            → Finance.Expense or another finance command
```

A candidate line is not an expense. Finance becomes the authority only when the owner records it, with a management class or with the class left unclassified. The adapter does not post journal entries. Fiscal accounting stays outside (`CON-ACC-001`). Matching rules are not designed here.

## Authentication

The domain assumes one application user role in the first stage: the owner. Workers, the vet, the economic partner, and commercial counterparties do not need accounts ([system-context.md](system-context.md)).

Authentication is a port in front of the application, not a ranch module. Sessions and passwords are generic. Physical architecture v0.1 uses library-based sessions stored in PostgreSQL ([ADR-010](adr/ADR-010-authentication.md)). Domain aggregates do not import that library.

If workers later record facts themselves, they become a second user class at this port. They do not become a bounded context.

## Object storage

Evidence bytes go to a file port: store, retrieve, and discard a blob by an opaque id. The association from blob to business fact lives on the owning record ([cross-cutting-concerns.md](cross-cutting-concerns.md)).

Development uses a filesystem adapter. Deployed environments use an S3-compatible object store through the same port. No storage vendor is chosen ([ADR-011](adr/ADR-011-evidence-storage.md)). The domain does not construct storage URLs.

## Dependency direction

```text
vendor or device
    → adapter (knows the vendor, depends inward)
        → application port (normalized fact or blob id)
            → domain module (no vendor types)
```

The arrow never points from Herd, Growth, Feeding, Inventory, or Finance toward a vendor package. Parentage and health notes are Herd records. They do not add a module that could import a vendor.

## Ports that are not excuses to widen scope

Naming a port does not pull its feature into the minimum package. The TO-BE exclusions still stand: no connected scale, no cameras, no messaging integration, no worker application, and no site internet as a starting requirement.

## Status

- Version: 0.2
- Status: Port boundaries only. No adapter implemented
- Last updated: 2026-10-04
- Source: `CON-SCALE-001`, `CON-SEC-001`, `CON-ACC-001`, `CAP-COMM-001`, `OQ-SCALE-001`, `OQ-SEC-001`
- Validation: Refined with the five-module cut. No vendor selected
