import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Login from "./Login";

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [recetas, setRecetas] = useState([]);
  const [comensales, setComensales] = useState(0);
  const [resultado, setResultado] = useState([]);
  const [filtroDia, setFiltroDia] = useState("semana");
  const [menu, setMenu] = useState({
    lunes: { principal: "", acompanamiento: "", postre: "" },
    martes: { principal: "", acompanamiento: "", postre: "" },
    miercoles: { principal: "", acompanamiento: "", postre: "" },
    jueves: { principal: "", acompanamiento: "", postre: "" },
    viernes: { principal: "", acompanamiento: "", postre: "" },
  });
  const [nuevaReceta, setNuevaReceta] = useState({ nombre: "", tipo: "principal", ingredientes: [{ nombre: "", unidad: "g", cantidad: 0 }] });
  const [recetaEditando, setRecetaEditando] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const recetasGuardadas = localStorage.getItem("recetas");
    if (recetasGuardadas) {
      setRecetas(JSON.parse(recetasGuardadas));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("recetas", JSON.stringify(recetas));
  }, [recetas]);

  const calcularPedido = () => {
    const ingredientesTotales = {};
    const dias = filtroDia === "semana" ? Object.values(menu) : [menu[filtroDia]];

    dias.forEach(({ principal, acompanamiento, postre }) => {
      [principal, acompanamiento, postre].forEach((rec) => {
        const receta = recetas.find(r => r.nombre === rec);
        if (receta) {
          receta.ingredientes.forEach(({ nombre, unidad, cantidad }) => {
            const clave = `${nombre.trim().toLowerCase()}-${unidad.trim().toLowerCase()}`;
            if (!ingredientesTotales[clave]) ingredientesTotales[clave] = 0;

            const esFruta = receta.tipo === "fruta" || ["banana", "manzana", "naranja", "pera", "mandarina", "ciruela"].includes(receta.nombre.toLowerCase());
            const cantFinal = esFruta ? 1 : cantidad;

            ingredientesTotales[clave] += cantFinal * comensales;
          });
        }
      });
    });

    const lista = Object.entries(ingredientesTotales).map(([clave, cantidad]) => {
      const [nombre, unidad] = clave.split("-");
      if (nombre === "huevo" && unidad === "g") {
        return { nombre: "Huevo", unidad: "unidad", cantidad: Math.ceil(cantidad / 45) };
      }
      return {
        nombre,
        unidad: cantidad >= 1000 ? (unidad === "ml" ? "l" : unidad === "g" ? "kg" : unidad) : unidad,
        cantidad: cantidad >= 1000 ? cantidad / 1000 : cantidad
      };
    });

    setResultado(lista);
  };

  const descargarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(resultado);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pedido");
    XLSX.writeFile(wb, "pedido_comedor.xlsx");
  };

  const handleModificarIngrediente = (index, field, value) => {
    const receta = recetaEditando !== null ? { ...recetas[recetaEditando] } : { ...nuevaReceta };
    receta.ingredientes[index][field] = field === "cantidad" ? Number(value) : value;
    if (recetaEditando !== null) {
      const nuevas = [...recetas];
      nuevas[recetaEditando] = receta;
      setRecetas(nuevas);
    } else {
      setNuevaReceta(receta);
    }
  };

  const handleAgregarIngrediente = () => {
    if (recetaEditando !== null) {
      const nuevas = [...recetas];
      nuevas[recetaEditando].ingredientes.push({ nombre: "", unidad: "g", cantidad: 0 });
      setRecetas(nuevas);
    } else {
      setNuevaReceta({ ...nuevaReceta, ingredientes: [...nuevaReceta.ingredientes, { nombre: "", unidad: "g", cantidad: 0 }] });
    }
  };

  const handleGuardarReceta = () => {
    if (recetaEditando !== null) {
      const nuevas = [...recetas];
      nuevas[recetaEditando] = { ...recetas[recetaEditando] };
      setRecetas(nuevas);
      setRecetaEditando(null);
    } else {
      setRecetas([...recetas, nuevaReceta]);
      setNuevaReceta({ nombre: "", tipo: "principal", ingredientes: [{ nombre: "", unidad: "g", cantidad: 0 }] });
    }
  };

  const editarReceta = (index) => {
    setRecetaEditando(index);
    setNuevaReceta({ ...recetas[index] });
  };

  const eliminarReceta = (nombre) => {
    setRecetas(recetas.filter(r => r.nombre !== nombre));
    if (recetaEditando !== null) setRecetaEditando(null);
  };

  if (!usuario) {
    return <Login onLogin={() => {}} />;
  }

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => signOut(auth)} style={{ float: "right" }}>🚪 Cerrar sesión</button>

      <h1>📋 Recetas</h1>
      <input
        placeholder="Nombre de la receta"
        value={nuevaReceta.nombre}
        onChange={(e) => setNuevaReceta({ ...nuevaReceta, nombre: e.target.value })}
        style={{ marginRight: 10 }}
      />
      <select
        value={nuevaReceta.tipo}
        onChange={(e) => setNuevaReceta({ ...nuevaReceta, tipo: e.target.value })}
      >
        <option value="principal">Principal</option>
        <option value="acompanamiento">Acompañamiento</option>
        <option value="postre">Postre</option>
        <option value="fruta">Fruta</option>
      </select>
      {nuevaReceta.ingredientes.map((ing, i) => (
        <div key={i}>
          <input
            placeholder="Ingrediente"
            value={ing.nombre}
            onChange={(e) => handleModificarIngrediente(i, "nombre", e.target.value)}
            style={{ marginRight: 5 }}
          />
          <input
            placeholder="Unidad"
            value={ing.unidad}
            onChange={(e) => handleModificarIngrediente(i, "unidad", e.target.value)}
            style={{ marginRight: 5 }}
          />
          <input
            type="number"
            placeholder="Cantidad"
            value={ing.cantidad}
            onChange={(e) => handleModificarIngrediente(i, "cantidad", e.target.value)}
            style={{ marginRight: 5 }}
          />
        </div>
      ))}
      <button onClick={handleAgregarIngrediente}>➕ Añadir ingrediente</button>
      <button onClick={handleGuardarReceta} style={{ marginLeft: 10 }}>💾 Guardar</button>

      <h2 style={{ marginTop: 30 }}>📚 Recetas guardadas</h2>
      <ul>
        {recetas.map((r, i) => (
          <li key={i}>
            {r.nombre} ({r.tipo})
            <button onClick={() => editarReceta(i)} style={{ marginLeft: 10 }}>📝 Editar</button>
            <button onClick={() => eliminarReceta(r.nombre)} style={{ marginLeft: 5 }}>🗑️ Eliminar</button>
          </li>
        ))}
      </ul>

      <h2 style={{ marginTop: 40 }}>📅 Menú semanal</h2>
      <div style={{ marginBottom: 20 }}>
        <label>📆 Ver pedido de:</label>
        <select value={filtroDia} onChange={(e) => setFiltroDia(e.target.value)} style={{ marginLeft: 10 }}>
          <option value="semana">Toda la semana</option>
          {Object.keys(menu).map((dia) => (
            <option key={dia} value={dia}>{dia.charAt(0).toUpperCase() + dia.slice(1)}</option>
          ))}
        </select>
      </div>

      {Object.keys(menu).map((dia) => (
        <div key={dia} style={{ marginBottom: 10 }}>
          <strong>{dia.toUpperCase()}:</strong>
          {["principal", "acompanamiento", "postre"].map((tipo) => (
            <select
              key={tipo}
              value={menu[dia][tipo]}
              onChange={(e) =>
                setMenu({
                  ...menu,
                  [dia]: { ...menu[dia], [tipo]: e.target.value },
                })
              }
              style={{ marginLeft: 5, marginRight: 10 }}
            >
              <option value="">-- {tipo} --</option>
              {recetas.filter((r) => r.tipo === tipo).map((r, idx) => (
                <option key={idx} value={r.nombre}>{r.nombre}</option>
              ))}
            </select>
          ))}
        </div>
      ))}

      <div style={{ marginTop: 20 }}>
        <label>👥 Comensales:</label>
        <input type="number" value={comensales} onChange={(e) => setComensales(Number(e.target.value))} style={{ marginLeft: 10 }} />
        <button onClick={calcularPedido} style={{ marginLeft: 10 }}>🧮 Calcular pedido</button>
      </div>

      {resultado.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h3>📦 Ingredientes Totales</h3>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>Ingrediente</th>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>Cantidad</th>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>Unidad</th>
              </tr>
            </thead>
            <tbody>
              {resultado.map((r, i) => (
                <tr key={i}>
                  <td style={{ border: "1px solid #ccc", padding: 8 }}>{r.nombre}</td>
                  <td style={{ border: "1px solid #ccc", padding: 8 }}>{r.cantidad}</td>
                  <td style={{ border: "1px solid #ccc", padding: 8 }}>{r.unidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={descargarExcel} style={{ marginTop: 10 }}>⬇️ Descargar Excel</button>
        </div>
      )}
    </div>
  );
}
