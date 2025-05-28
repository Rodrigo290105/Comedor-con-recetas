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
    lunes: { principal: "", acompañamiento: "", postre: "" },
    martes: { principal: "", acompañamiento: "", postre: "" },
    miercoles: { principal: "", acompañamiento: "", postre: "" },
    jueves: { principal: "", acompañamiento: "", postre: "" },
    viernes: { principal: "", acompañamiento: "", postre: "" },
  });
  const [nuevaReceta, setNuevaReceta] = useState({
    nombre: "",
    tipo: "principal",
    ingredientes: [{ nombre: "", unidad: "g", cantidad: 0 }],
  });
  const [recetaEditando, setRecetaEditando] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
    });
    return () => unsubscribe();
  }, []);

  // CARGA RECETAS (precargadas y usuario), NORMALIZA TIPO
  useEffect(() => {
    const recetasUsuario = JSON.parse(localStorage.getItem("recetas")) || [];
    fetch("/data/recetas_precargadas.json")
      .then(res => res.json())
      .then(data => {
        const recetasNormalizadas = data.map(r => {
          // Normaliza el tipo (quita tildes y pasa a minúscula)
          const tipoNormalizado = r.tipo
            ? r.tipo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
            : "";
          // Si vino como 'acompanamiento', lo cambiamos a 'acompañamiento'
          const tipoFinal = tipoNormalizado === "acompanamiento" ? "acompañamiento" : tipoNormalizado;

          // Corrige el nombre del ingrediente si viene como 'ingrediente'
          const ingredientes = (r.ingredientes || []).map(ing => ({
            nombre: ing.nombre || ing.ingrediente || "",
            unidad: ing.unidad,
            cantidad: ing.cantidad
          }));
          return {
            ...r,
            tipo: tipoFinal,
            ingredientes
          };
        });
        setRecetas([...recetasNormalizadas, ...recetasUsuario]);
      });
  }, []);

  useEffect(() => {
    localStorage.setItem("recetas", JSON.stringify(recetas));
  }, [recetas]);

  const calcularPedido = () => {
    const ingredientesTotales = {};
    const dias = filtroDia === "semana" ? Object.values(menu) : [menu[filtroDia]];

    dias.forEach(({ principal, acompañamiento, postre }) => {
      [principal, acompañamiento, postre].forEach((rec) => {
        const receta = recetas.find(r => r.nombre === rec);
        if (receta) {
          receta.ingredientes.forEach(({ nombre, unidad, cantidad }) => {
            const clave = `${nombre.trim().toLowerCase()}-${unidad.trim().toLowerCase()}`;
            if (!ingredientesTotales[clave]) ingredientesTotales[clave] = 0;

            const esFruta =
              receta.tipo === "fruta" ||
              ["banana", "manzana", "naranja", "pera", "mandarina", "ciruela"].includes(
                receta.nombre.toLowerCase()
              );
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
        unidad:
          cantidad >= 1000
            ? unidad === "ml"
              ? "l"
              : unidad === "g"
              ? "kg"
              : unidad
            : unidad,
        cantidad: cantidad >= 1000 ? cantidad / 1000 : cantidad,
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
    const receta =
      recetaEditando !== null ? { ...nuevaReceta } : { ...nuevaReceta };
    receta.ingredientes[index][field] = field === "cantidad" ? Number(value) : value;
    setNuevaReceta(receta);
  };

  const handleAgregarIngrediente = () => {
    setNuevaReceta({
      ...nuevaReceta,
      ingredientes: [
        ...nuevaReceta.ingredientes,
        { nombre: "", unidad: "g", cantidad: 0 },
      ],
    });
  };

  const handleGuardarReceta = () => {
    if (recetaEditando !== null) {
      const nuevas = [...recetas];
      nuevas[recetaEditando] = { ...nuevaReceta };
      setRecetas(nuevas);
      setRecetaEditando(null);
    } else {
      setRecetas([...recetas, nuevaReceta]);
      setNuevaReceta({
        nombre: "",
        tipo: "principal",
        ingredientes: [{ nombre: "", unidad: "g", cantidad: 0 }],
      });
    }
  };

  const editarReceta = (index) => {
    setRecetaEditando(index);
    setNuevaReceta({ ...recetas[index] });
  };

  const eliminarReceta = (nombre) => {
    setRecetas(recetas.filter((r) => r.nombre !== nombre));
    if (recetaEditando !== null) setRecetaEditando(null);
  };

  if (!usuario) {
    return <Login onLogin={() => {}} />;
  }

  return (
    <div style={{
      background: "#23272f",
      minHeight: "100vh",
      color: "#fafafa",
      fontFamily: "sans-serif",
      padding: 30
    }}>
      <button
        onClick={() => signOut(auth)}
        style={{
          float: "right",
          background: "#444",
          color: "#fff",
          borderRadius: 10,
          padding: "6px 20px",
          marginBottom: 10
        }}>
        🚪 Cerrar sesión
      </button>

      {/* =========== MENÚ SEMANAL =========== */}
      <h2 style={{
        marginTop: 0,
        color: "#fff",
        fontSize: "1.7em",
        letterSpacing: 1
      }}>📅 Menú semanal</h2>
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
          {["principal", "acompañamiento", "postre"].map((tipo) => (
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
              {recetas
                .filter((r) => r.tipo === tipo)
                .map((r, idx) => (
                  <option key={idx} value={r.nombre}>
                    {r.nombre}
                  </option>
                ))}
            </select>
          ))}
        </div>
      ))}

      {/* =========== PEDIDO =========== */}
      <div style={{ marginTop: 20 }}>
        <label>👥 Comensales:</label>
        <input
          type="number"
          value={comensales}
          onChange={(e) => setComensales(Number(e.target.value))}
          style={{ marginLeft: 10, borderRadius: 5, padding: 4 }}
        />
        <button
          onClick={calcularPedido}
          style={{
            marginLeft: 10,
            background: "#3c8f4a",
            color: "#fff",
            borderRadius: 7,
            padding: "7px 18px",
            fontWeight: 600
          }}>
          🧮 Calcular pedido
        </button>
      </div>
      {resultado.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h3 style={{ marginTop: 0, color: "#fff" }}>📦 Ingredientes Totales</h3>
          <table style={{
            borderCollapse: "collapse",
            width: "100%",
            background: "#292d37",
            borderRadius: 12,
            color: "#fafafa"
          }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #888", padding: 8 }}>Ingrediente</th>
                <th style={{ border: "1px solid #888", padding: 8 }}>Cantidad</th>
                <th style={{ border: "1px solid #888", padding: 8 }}>Unidad</th>
              </tr>
            </thead>
            <tbody>
              {resultado.map((r, i) => (
                <tr key={i}>
                  <td style={{ border: "1px solid #333", padding: 8 }}>{r.nombre}</td>
                  <td style={{ border: "1px solid #333", padding: 8 }}>{r.cantidad}</td>
                  <td style={{ border: "1px solid #333", padding: 8 }}>{r.unidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={descargarExcel}
            style={{
              marginTop: 10,
              background: "#2072bc",
              color: "#fff",
              borderRadius: 8,
              padding: "7px 22px"
            }}>
            ⬇️ Descargar Excel
          </button>
        </div>
      )}

      {/* =========== AGREGAR RECETA =========== */}
      <h2 style={{ marginTop: 40, color: "#fff" }}>➕ Agregar nueva receta</h2>
      <input
        placeholder="Nombre de la receta"
        value={nuevaReceta.nombre}
        onChange={(e) =>
          setNuevaReceta({ ...nuevaReceta, nombre: e.target.value })
        }
        style={{ marginRight: 10, borderRadius: 5, padding: 5 }}
      />
      <select
        value={nuevaReceta.tipo}
        onChange={(e) =>
          setNuevaReceta({ ...nuevaReceta, tipo: e.target.value })
        }
      >
        <option value="principal">Principal</option>
        <option value="acompañamiento">Acompañamiento</option>
        <option value="postre">Postre</option>
        <option value="fruta">Fruta</option>
      </select>
      {nuevaReceta.ingredientes.map((ing, i) => (
        <div key={i} style={{ marginTop: 4 }}>
          <input
            placeholder="Ingrediente"
            value={ing.nombre}
            onChange={(e) => handleModificarIngrediente(i, "nombre", e.target.value)}
            style={{ marginRight: 5, borderRadius: 5, padding: 4 }}
          />
          <input
            placeholder="Unidad"
            value={ing.unidad}
            onChange={(e) => handleModificarIngrediente(i, "unidad", e.target.value)}
            style={{ marginRight: 5, borderRadius: 5, padding: 4 }}
          />
          <input
            type="number"
            placeholder="Cantidad"
            value={ing.cantidad}
            onChange={(e) => handleModificarIngrediente(i, "cantidad", e.target.value)}
            style={{ marginRight: 5, borderRadius: 5, padding: 4 }}
          />
        </div>
      ))}
      <button
        onClick={handleAgregarIngrediente}
        style={{
          marginTop: 8,
          background: "#2051bc",
          color: "#fff",
          borderRadius: 7,
          padding: "7px 18px"
        }}>
        ➕ Añadir ingrediente
      </button>
      <button
        onClick={handleGuardarReceta}
        style={{
          marginLeft: 10,
          background: "#238c32",
          color: "#fff",
          borderRadius: 8,
          padding: "7px 22px"
        }}>
        💾 Guardar
      </button>

      {/* =========== RECETAS GUARDADAS =========== */}
      <h2 style={{ marginTop: 30, color: "#fff" }}>📚 Recetas guardadas</h2>
      <ul>
        {recetas.map((r, i) => (
          <li key={i}>
            {r.nombre} ({r.tipo})
            <button
              onClick={() => {
                editarReceta(i);
              }}
              style={{
                marginLeft: 10,
                background: "#292d37",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "4px 14px"
              }}
            >
              📝 Editar
            </button>
            <button
              onClick={() => eliminarReceta(r.nombre)}
              style={{
                marginLeft: 5,
                background: "#B94B4B",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "4px 14px"
              }}
            >
              🗑️ Eliminar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
