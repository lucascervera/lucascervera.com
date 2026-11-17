---
spec_version: "V_0-6-0"
spec_url: "specs/bluepriNNts/personal-site/spec_NN.md"
level: 2
parent_spec:
  name: "iNNfo_V_0-6-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/iNNfo_V_0-6-0_NN.md"
blueprint_version: "V_0-1-0"
title: "Personal Site App"
relationship_types:
  hierarchy:
    enabled: true
    via: "index block"
  evaluable_matrix:
    enabled: false
  graph_edge:
    enabled: false
  sequence:
    enabled: false
---

# NN index

* [[Perfil]]
* [[Contexto]]
* [[Emprendimiento]]
* [[Actividad]]
* [[Galeria]]

# NN Concept Definition

## NN Concept Definition: Perfil
icon:: user
type:: list
color:: blue
weight:: 100

## NN Concept Definition: Contexto
icon:: book-open
type:: list
color:: slate
weight:: 90

## NN Concept Definition: Emprendimiento
icon:: rocket
type:: list
color:: indigo
weight:: 80

## NN Concept Definition: Actividad
icon:: activity
type:: list
color:: green
weight:: 60

## NN Concept Definition: Galeria
icon:: images
type:: list
color:: rose
weight:: 50

# NN Field Definition

## NN Field Definition: tags
concept:: *
type:: select
multiple:: true
description:: Open vocabulary ad-hoc tags and classification labels.

## NN Field Definition: nombre
concept:: Perfil
type:: string
description:: Full public name.

## NN Field Definition: titular
concept:: Perfil
type:: string
description:: One-line professional positioning shown under the name.

## NN Field Definition: titular_corto
concept:: Perfil
type:: string
description:: Short headline used for the page title and social cards. At most 60 characters.

## NN Field Definition: resumen
concept:: Perfil
type:: string
description:: Short professional summary.

## NN Field Definition: email
concept:: Perfil
type:: string
description:: Public contact email.

## NN Field Definition: linkedin
concept:: Perfil
type:: string
description:: Public LinkedIn profile URL.

## NN Field Definition: foto
concept:: Perfil
type:: image
description:: Portrait image used in the hero section.

## NN Field Definition: ubicacion
concept:: Perfil
type:: string
description:: Public location line.

## NN Field Definition: actualizado
concept:: Perfil
type:: string
description:: ISO 8601 date of the last published change. Feeds dateModified and the sitemap lastmod.

## NN Field Definition: titulo
concept:: Contexto
type:: string
description:: Short label of the passage, used as a heading in the machine-readable file.

## NN Field Definition: cuerpo
concept:: Contexto
type:: string
description:: One self-contained paragraph explaining an aspect of the practice. Rendered only in llms-full.txt, never on the page.

## NN Field Definition: nombre
concept:: Emprendimiento
type:: string
description:: Public name of the venture.

## NN Field Definition: anio
concept:: Emprendimiento
type:: string
description:: Year the venture started.

## NN Field Definition: descripcion
concept:: Emprendimiento
type:: string
description:: One-line description shown on the card.

## NN Field Definition: url
concept:: Emprendimiento
type:: string
description:: Public website of the venture.

## NN Field Definition: nombre
concept:: Actividad
type:: string
description:: Public name of the activity.

## NN Field Definition: descripcion
concept:: Actividad
type:: string
description:: What the activity consists of.

## NN Field Definition: metrica_etiqueta
concept:: Actividad
type:: string
description:: Label of the quantitative claim, for example hours of teaching.

## NN Field Definition: metrica_valor
concept:: Actividad
type:: string
description:: Numeric value of the claim, including its unit.

## NN Field Definition: nombre
concept:: Galeria
type:: string
description:: Public name of the gallery, also used as the section anchor.

## NN Field Definition: descripcion
concept:: Galeria
type:: string
description:: One-line description shown under the gallery heading.

## NN Field Definition: url
concept:: Galeria
type:: string
description:: Public URL of the media collection, embedded as-is in an iframe.

## NN Field Definition: url_externa
concept:: Galeria
type:: string
description:: Optional public URL offered as a "see all" link next to the embed.

# NN Matrix Definition

# Personal Site App

## A domain for a one-page professional site

## Philosophy

The site is a projection of this model, never the opposite. Editing the published HTML
creates a second source of truth and is therefore forbidden. Every visible string on the
site resolves to a field here.

## Specification

### Concepts

| Concept | Type | Purpose |
|---|---|---|
| **Perfil** | list | The person and their public positioning (exactly one element) |
| **Contexto** | list | Machine-readable passages explaining the practice; never rendered on the page |
| **Emprendimiento** | list | Ventures and companies, ordered by year |
| **Actividad** | list | Professional activities carrying a quantitative claim |
| **Galeria** | list | Embedded media collections (videos, photos) |

### Fields

See the `# NN Field Definition` section above. Every field is `string` unless declared otherwise.

### Matrices

None. There is no N:M relationship in this domain; forcing one would be ceremony without meaning.

### Relationship Types

| Type | Enabled | Representation |
|---|---|---|
| Hierarchy | yes | index block (wikilinks) |
| Evaluable matrix | no | Not applicable |
| Graph edge | no | Not applicable |
| Sequence | no | Not applicable |

## Template

### Level 3 Model Template

```yaml
---
level: 3
parent_spec:
  name: "personal-site_V_0-1-0"
  url: "specs/bluepriNNts/personal-site/spec_NN.md"
knowledge_version: "V_x-y-z"
title: "Personal Site"
---
```

Then one `# NN <Concept>` section per concept, with one `## NN <Concept>: <ElementId>`
block per element and one `key:: value` line per declared field.

# Concept Guidance Documentation

## Perfil

### Summary
The public identity of the site owner. Exactly one element must exist.

### Description
Holds the name, positioning line, summary, contact channels, portrait and location.
Every field here is rendered in the hero or contact section of the generated site.

### Methodologies
Derive the content from a public CV or resume, and keep every claim verifiable by the
person named in `nombre`. Do not model private data: this document is published.

### Prompts
- "Change the `titular` to a shorter positioning line."
- "Add a second public contact channel."

## Contexto

### Summary
Self-contained passages written for machine readers, not for the page.

### Description
Each element is one paragraph that answers a question an AI assistant might be asked
about the person: what they do, how they started, what cogNNitive is, what the
professional service delivers. Passages render only into `llms-full.txt`. They never
appear in the HTML, so the public copy stays untouched.

### Methodologies
Write answer-first: the first sentence must stand alone and name the entity. Keep one
idea per element, 40 to 90 words. Repeat the key entities (Inteligencia Artificial,
adopción, conocimiento, trazabilidad) instead of stuffing keywords. Every number must
be traceable to another concept in this model.

### Prompts
- "Add a passage explaining which companies this service is for."
- "Rewrite the services passage to lead with the outcome."

## Emprendimiento

### Summary
A venture, company or project the person founded or co-founded.

### Description
One element per venture, ordered chronologically by `anio`. The generated site renders
them as cards sorted by year, newest first, and links `url` when present.

### Methodologies
Record only ventures with a public reference. `descripcion` is one sentence and states
what the venture does, not what it achieved.

### Prompts
- "Add the new venture with its year and URL."
- "Shorten the description of innV0 to a single line."

## Actividad

### Summary
A professional activity carrying a quantitative claim.

### Description
Each element names an activity and optionally pairs it with `metrica_etiqueta` and
`metrica_valor`. The generated site renders the label and value as a highlight when both
are present, and as plain prose when they are absent.

### Methodologies
Keep the metric honest and rounded: state the measurement basis in the label, not in the
number. Leave the metric empty rather than inventing one.

### Prompts
- "Update the conferences metric to the current number."
- "Add an activity for open source maintenance."

## Galeria

### Summary
A media collection hosted outside the site, embedded whole.

### Description
One element per collection, rendered as a titled section with a lazy iframe and an
optional external link. The element id becomes the section anchor, lowercased, so
`Galeria: Videos` is reachable at `#videos` and old deep links keep working.

### Methodologies
Embed the canonical public URL of the collection, never a private or expiring link.
The site stores no media: it only points at the host. Keep one element per collection
so that a dead embed can be removed without touching the rest.

### Prompts
- "Add the photo gallery with its public URL."
- "Replace the videos embed with the new folder link."

