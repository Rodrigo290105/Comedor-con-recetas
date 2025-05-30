import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import * as XLSX from "xlsx";

// Utilidad para formatear fecha
function formatoFecha(fecha) {
  try {
    if (!fecha) return "";
    const date = typeof fecha === "string" ? new Date(fecha) : fecha.toDate ? fecha.toDate() : fecha;
    return date.toLocaleString("es-UY");
  } catch {
    return "";
  }
}

export default function HistorialPedidos({ usuario }) {
  const [pedidos, setPedidos] = useState([]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!usuario) return;
    // Consulta Firestore por usuario
    const fetchPedidos = async () => {
      setCargando(true);
      let q = query(
        collection(db, "pedidos"),
        where("uid", "==", usuario.uid),
        orderBy("fecha", "desc")
      );
      const querySnapshot = await getDocs(q);
      const datos = [];
      querySnapshot.forEach(doc => datos.push({ id: doc.id, ...doc.data() }));
      setPedidos(datos);
      setCargando(false);
    };
    fetchPedidos();
  }, [usuario]);

  // Filtra pedidos por fechas
  const pedidosFiltrados = pedidos.filter(p => {
    if (!fechaInicio && !fechaFin) return true;
    const fecha = p.fecha instanceof Date ? p.fecha : (p.fecha && p.fecha.toDate ? p.fecha.toDate() : new Date(p.fecha));
    if (fechaInicio && fecha < new Date(fechaInicio)) return false;
    if (fechaFin && fecha > new Date(fechaFin + "T23:59:59")) return false;
    return true;
  });

  // Descargar historial a Excel
  const descargarExcelHistorial = () => {
    const datosExcel = pedidosFiltrados.map((p) => ({
      Fecha: formatoFecha(p.fecha),
      Comensales: p.comensales,
      "Menú (JSON)": JSON.stringify(p.menu),
      Ingredientes: p.ingredientes.map(i => `${i.nombre}: ${i.cantidad} ${i.unidad}`).join(", "),
    }));
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial");
    XLSX.writeFile(wb, "historial_pedidos.xlsx");
  };

  return (
    <div>
      <h2 style={{ color: "#fff" }}>📜 Historial de pedidos</h2>
      <div style={{ marginBottom: 16, background: "#292d37", padding: 16, borderRadius: 10 }}>
        <label style={{ color: "#fafafa" }}>
          Desde:{" "}
          <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={{ marginRight: 12 }} />
        </label>
        <label style={{ color: "#fafafa" }}>
          Hasta:{" "}
          <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} style={{ marginRight: 16 }} />
        </label>
        <button onClick={descargarExcelHistorial} style={{
          background: "#2072bc",
          color: "#fff",
          borderRadius: 8,
          padding: "7px 22px"
        }}>
          ⬇️ Descargar historial Excel
        </button>
      </div>
      {cargando ? (
        <p style={{ color: "#fafafa" }}>Cargando historial...</p>
      ) : pedidosFiltrados.length === 0 ? (
        <p style={{ color: "#fafafa" }}>No hay pedidos para mostrar en este período.</p>
      ) : (
        <table style={{
          borderCollapse: "collapse",
          width: "100%",
          background: "#292d37",
          borderRadius: 10,
          color: "#fafafa",
        }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #888", padding: 8 }}>Fecha</th>
              <th style={{ border: "1px solid #888", padding: 8 }}>Comensales</th>
              <th style={{ border: "1px solid #888", padding: 8 }}>Menú</th>
              <th style={{ border: "1px solid #888", padding: 8 }}>Ingredientes</th>
            </tr>
          </thead>
          <tbody>
            {pedidosFiltrados.map((p, idx) => (
              <tr key={idx}>
                <td style={{ border: "1px solid #333", padding: 8 }}>{formatoFecha(p.fecha)}</td>
                <td style={{ border: "1px solid #333", padding: 8 }}>{p.comensales}</td>
                <td style={{ border: "1px solid #333", padding: 8 }}>
                  {Object.entries(p.menu || {}).map(([dia, val]) =>
                    <div key={dia}>
                      <b>{dia.charAt(0).toUpperCase() + dia.slice(1)}:</b>{" "}
                      {["principal", "acompañamiento", "postre"].map(k =>
                        val && val[k] ? <span key={k}>{k}: {val[k]} </span> : null
                      )}
                    </div>
                  )}
                </td>
                <td style={{ border: "1px solid #333", padding: 8 }}>
                  {p.ingredientes && p.ingredientes.map((i, ii) =>
                    <div key={ii}>{i.nombre}: {i.cantidad} {i.unidad}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
