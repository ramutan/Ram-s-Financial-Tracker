/* ==========================================================================
   Ram's Financial Tracker — application logic
   Vanilla JavaScript, persisted with localStorage.
   ========================================================================== */

(function () {
  "use strict";

  var STORAGE_KEY = "ram-financial-tracker";

  /** @type {{ funds: number, entries: Array<{id:number,price:number,category:string,note:string,date:string}> }} */
  var state = { funds: 0, entries: [] };

  // --- DOM references -------------------------------------------------------
  var fundsInput = document.getElementById("totalfunds");
  var setFundsBtn = document.getElementById("setfundsBtn");
  var statTotal = document.getElementById("statTotal");
  var statSpent = document.getElementById("statSpent");
  var statSaved = document.getElementById("statSaved");
  var entryForm = document.getElementById("entryForm");
  var priceInput = document.getElementById("price");
  var categoryInput = document.getElementById("category");
  var noteInput = document.getElementById("note");
  var tableBody = document.getElementById("tablebody");
  var emptyState = document.getElementById("emptyState");
  var exportBtn = document.getElementById("exportBtn");
  var clearBtn = document.getElementById("clearBtn");

  // --- Helpers --------------------------------------------------------------
  function peso(value) {
    return "₱" + Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatDate(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "2-digit" });
  }

  function totalSpent() {
    return state.entries.reduce(function (sum, e) {
      return sum + e.price;
    }, 0);
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("Unable to persist data:", err);
    }
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      state.funds = Number(parsed.funds) || 0;
      state.entries = Array.isArray(parsed.entries) ? parsed.entries : [];
    } catch (err) {
      console.warn("Unable to read stored data:", err);
    }
  }

  // --- Rendering ------------------------------------------------------------
  function render() {
    var spent = totalSpent();
    var savings = state.funds - spent;

    statTotal.textContent = peso(state.funds);
    statSpent.textContent = peso(spent);
    statSaved.textContent = peso(savings);

    tableBody.innerHTML = "";
    var remaining = state.funds;

    state.entries.forEach(function (entry, index) {
      remaining -= entry.price;

      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + (index + 1) + "</td>" +
        "<td>" + formatDate(entry.date) + "</td>" +
        '<td><span class="pill"></span></td>' +
        "<td></td>" +
        '<td class="right amount">-' + peso(entry.price) + "</td>" +
        '<td class="right remaining' + (remaining < 0 ? " negative" : "") + '">' + peso(remaining) + "</td>" +
        '<td class="right"><button type="button" class="row-delete" aria-label="Delete entry">Remove</button></td>';

      // Text content is assigned (not interpolated) to avoid HTML injection.
      tr.querySelector(".pill").textContent = entry.category;
      tr.children[3].textContent = entry.note || "—";
      tr.querySelector(".row-delete").addEventListener("click", function () {
        removeEntry(entry.id);
      });

      tableBody.appendChild(tr);
    });

    emptyState.hidden = state.entries.length > 0;
  }

  // --- Actions --------------------------------------------------------------
  function setFunds() {
    var value = parseFloat(fundsInput.value);
    if (isNaN(value) || value < 0) {
      fundsInput.focus();
      return;
    }
    state.funds = value;
    save();
    render();
  }

  function addEntry(event) {
    event.preventDefault();

    var price = parseFloat(priceInput.value);
    var category = categoryInput.value.trim();
    if (isNaN(price) || price <= 0 || !category) return;

    state.entries.push({
      id: Date.now(),
      price: price,
      category: category,
      note: noteInput.value.trim(),
      date: new Date().toISOString(),
    });

    save();
    render();
    entryForm.reset();
    priceInput.focus();
  }

  function removeEntry(id) {
    state.entries = state.entries.filter(function (e) {
      return e.id !== id;
    });
    save();
    render();
  }

  function exportCSV() {
    if (!state.entries.length) return;

    var rows = [["Date", "Category", "Note", "Price"]];
    state.entries.forEach(function (e) {
      rows.push([formatDate(e.date), e.category, e.note, e.price.toFixed(2)]);
    });

    var csv = rows
      .map(function (row) {
        return row
          .map(function (cell) {
            return '"' + String(cell).replace(/"/g, '""') + '"';
          })
          .join(",");
      })
      .join("\n");

    var url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    var link = document.createElement("a");
    link.href = url;
    link.download = "financial-tracker.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function clearAll() {
    if (!window.confirm("Clear all funds and entries? This cannot be undone.")) return;
    state = { funds: 0, entries: [] };
    fundsInput.value = "";
    save();
    render();
  }

  // --- Wiring ---------------------------------------------------------------
  setFundsBtn.addEventListener("click", setFunds);
  entryForm.addEventListener("submit", addEntry);
  exportBtn.addEventListener("click", exportCSV);
  clearBtn.addEventListener("click", clearAll);

  load();
  if (state.funds) fundsInput.value = state.funds;
  render();
})();
