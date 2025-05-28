import React, { useEffect, useState } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export default function HistorialPedidos({ usuario }) {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargarPedidos() {
      setLoading(true);
      if (!usuario) return;
      const q = query(
        collection(db, "pedidos"),
        where("uid", "==", usuario.uid),
        orderBy("fecha", "desc")
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      setPedidos(docs);
      setLoading(false);
    }
    cargarPedidos();
  }, [usuario]);

  return (
    <div>
      <h2 style={{ color: "#fff", marginBottom: 20 }}>📜 Historial de pedidos</h2>
      {loading && <p>Cargando...</p>}
      {!loading && pedidos.length === 0 && (
        <p style={{ color: "#aaa" }}>No hay pedidos previos.</p>
      )}
      {pedidos.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{
            borderCollapse: "collapse",
            width: "100%",
            background: "#292d37",
            borderRadius: 12,
            color: "#fafafa",
            marginBottom: 40
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
              {pedidos.map((pedido) => (
                <tr key={pedido.id}>
                  <td style={{ border: "1px solid #333", padding: 8 }}>
                    {pedido.fecha && pedido.fecha.toDate
                      ? pedido.fecha.toDate().toLocaleString("es-UY")
                      : new Date(pedido.fecha).toLocaleString("es-UY")}
                  </td>
                  <td style={{ border: "1px solid #333", padding: 8 }}>{pedido.comensales}</td>
                  <td style={{ border: "1px solid #333", padding: 8, whiteSpace: "pre-line" }}>
                    {Object.entries(pedido.menu || {}).map(([dia, val]) =>
                      `${dia.charAt(0).toUpperCase() + dia.slice(1)}: ${["principal", "acompañamiento", "postre"]
                        .map(tipo => val[tipo] ? `${tipo}: ${val[tipo]}` : "")
                        .filter(Boolean).join(", ")}`
                    ).join("\n")}
                  </td>
                  <td style={{ border: "1px solid #333", padding: 8 }}>
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {(pedido.ingredientes || []).map((ing, i) => (
                        <li key={i}>{ing.nombre} — {ing.cantidad} {ing.unidad}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}