# ADR 0005 · next-intl with Marathi as the default

## Context

The demo must support Marathi, Hindi and English across Rider, Driver and Coordinator flows. The research identifies reading comfort, intermittent data and pickup cue recognition as field questions. Marathi is the product default. [Problem definition](../01-understand/problem-definition.md#personas)

## Decision

Use next-intl with App Router under `[locale]`. Support `mr`, `hi` and `en`, with `mr` the default. Use explicit locale prefixes and disable browser-language detection so a new unprefixed visit resolves to Marathi. Persist an explicit language preference in the locale URL, preserve it through authorized redirects, and carry it into notification presentation using the Driver's saved locale if needed. Exclude callbacks, internal routes and static assets from locale Proxy matching. [next-intl routing](https://next-intl.dev/docs/routing/configuration)

Translate stable error codes and view labels through typed ICU message keys. Keep Domain and Application free of localized sentences. Store localized Town content and Landmark names and cues with the curated catalogue, with all three translations required for contest fixtures. Format INR from integer paise and display dates and deadlines in the Town timezone. Set HTML `lang` and preserve the locale when switching a page or reopening the PWA.

Test translation parity and the visible grievance contact on quote, confirmation, status, offer and Trip screens. In a licensed fixture verify ULIN visibility and the destination and fare disclosure order in each locale.

## Alternatives considered

| Alternative | Trade-off |
| --- | --- |
| Hand-written dictionaries and localized routes | Small initial footprint and more custom code for routing, formats and message parity. |
| Automatic browser-language selection | Can match a rider's browser and can bypass the intended Marathi default on shared devices. |
| One language per persona | Simplifies copy and prevents people from choosing the language they read most easily. |

## Consequences

Review translations and short Marathi pickup cues with intended users. Keep message keys, seeded content and locale routes aligned. Test shareable links, reconnect paths and language switching. Keep localized UI copy out of stored business events.
