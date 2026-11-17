/* consoles/views/publicacion.js — Publicación
   Audita qué publica el sitio, elemento por elemento: qué superficie lo emite
   (página, llms.txt o llms-full.txt) y si tiene cargado su dato crítico. */
registerView({
  title: 'Publicación',
  icon: 'layers',
  order: 15,
  kind: 'editable',
  mount: function (ctx) {
    var doc = ctx.container.ownerDocument
    var ui = ctx.ui || (typeof nnUI !== 'undefined' ? nnUI : null)
    if (!ui) {
      ctx.container.appendChild(
        doc.createTextNode('La vista necesita el runtime de la consola (nnUI).'),
      )
      return
    }

    var model = (ctx.payload && ctx.payload.model) || {}
    var elements = Array.isArray(model.elements) ? model.elements.slice() : []
    var modelId = (model.meta && (model.meta.modelId || model.meta.model)) || 'model'

    // El campo que decide si el elemento es publicable, por concepto.
    var CRITICAL = {
      Perfil: { field: 'titular', label: 'Titular' },
      Contexto: { field: 'cuerpo', label: 'Pasaje' },
      Emprendimiento: { field: 'url', label: 'URL' },
      Actividad: { field: 'metrica_valor', label: 'Métrica' },
      Galeria: { field: 'url', label: 'Embed' },
    }

    function conceptOf(el) {
      return el.concept || el.type || '—'
    }

    function fieldOf(el, key) {
      if (el.fields && typeof el.fields === 'object' && el.fields[key] != null) return el.fields[key]
      return el[key]
    }

    function hasValue(el, key) {
      var value = fieldOf(el, key)
      return value != null && String(value).trim() !== ''
    }

    var rows = elements
      .map(function (el) {
        var concept = conceptOf(el)
        var critical = CRITICAL[concept] || null
        var missing = critical ? !hasValue(el, critical.field) : false
        return {
          id: el.id,
          name: el.name || el.id,
          concept: concept,
          color: el.color,
          index: el.index,
          __criticalLabel: critical ? critical.label : '—',
          __state: missing ? 'Falta' : 'Completo',
          __missing: missing,
          __surface: concept === 'Contexto' ? 'llms-full.txt' : 'Página + llms.txt',
        }
      })
      .sort(function (a, b) {
        if (a.concept !== b.concept) return String(a.concept).localeCompare(String(b.concept), 'es')
        return String(a.name).localeCompare(String(b.name), 'es')
      })

    var concepts = Object.keys(CRITICAL)
    var missingTotal = rows.filter(function (row) {
      return row.__missing
    }).length

    var items = concepts.map(function (concept) {
      var count = rows.filter(function (row) {
        return row.concept === concept
      }).length
      return { label: concept, value: count, concept: concept, modelId: modelId }
    })
    items.push({
      label: 'Sin dato crítico',
      value: missingTotal,
      hint: 'Elementos con el campo que decide su publicación vacío',
      modelId: modelId,
    })

    ctx.container.appendChild(ui.KpiGrid({ items: items }, { doc: doc, modelId: modelId }))

    var table = ui.DataTable(
      {
        columns: [
          { key: 'concept', label: 'Concepto' },
          { key: 'name', label: 'Elemento', kind: 'element' },
          { key: 'surface', label: 'Superficie', value: function (el) { return el.__surface } },
          { key: 'critical', label: 'Dato crítico', value: function (el) { return el.__criticalLabel } },
          { key: 'state', label: 'Estado', value: function (el) { return el.__state } },
        ],
        rows: rows,
        emptyText: 'El modelo todavía no tiene elementos.',
      },
      {
        doc: doc,
        modelId: modelId,
        onEdit: function (elementId) {
          if (ctx.modal && typeof ctx.modal.edit === 'function') ctx.modal.edit({ elementId: elementId })
        },
      },
    )
    ctx.container.appendChild(table)
  },
})
