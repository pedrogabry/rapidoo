import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, push, set, onValue, remove, update } from "firebase/database";
import { auth, database } from "../firebaseConfig";

const GlobalContext = createContext({});
const CART_STORAGE_KEY = "@efood_cart_v1";

export function GlobalProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const [loadingCart, setLoadingCart] = useState(true);
  const [enderecos, setEnderecos] = useState([]);
  const [loadingEnderecos, setLoadingEnderecos] = useState(true);

  // Escutar autenticação do Firebase para manter estado global do usuário
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Escutar endereços salvos do usuário logado
  useEffect(() => {
    if (!user || !user.uid) {
      setEnderecos([]);
      setLoadingEnderecos(false);
      return;
    }

    const enderecosRef = ref(database, `usuarios/${user.uid}/enderecos`);
    const unsubscribe = onValue(
      enderecosRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const lista = Object.entries(data).map(([id, end]) => ({
            id,
            ...end,
          }));
          setEnderecos(lista);
        } else {
          setEnderecos([]);
        }
        setLoadingEnderecos(false);
      },
      (error) => {
        console.error("Erro ao escutar endereços:", error);
        setLoadingEnderecos(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Carregar carrinho salvo no AsyncStorage ao iniciar o app
  useEffect(() => {
    async function loadCart() {
      try {
        const savedCart = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (savedCart) {
          setCart(JSON.parse(savedCart));
        }
      } catch (error) {
        console.error("Erro ao carregar carrinho do AsyncStorage:", error);
      } finally {
        setLoadingCart(false);
      }
    }
    loadCart();
  }, []);

  // Salvar carrinho no AsyncStorage sempre que for alterado
  useEffect(() => {
    if (!loadingCart) {
      AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart)).catch((err) =>
        console.error("Erro ao salvar carrinho no AsyncStorage:", err)
      );
    }
  }, [cart, loadingCart]);

  // Adicionar item ao carrinho
  function addToCart(item) {
    setCart((prevCart) => {
      const newItem = {
        ...item,
        id: item.id || Date.now().toString() + Math.random().toString(36).substr(2, 4),
      };
      return [...prevCart, newItem];
    });
  }

  // Aumentar quantidade
  function aumentarQtd(id) {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === id ? { ...item, quantidade: item.quantidade + 1 } : item
      )
    );
  }

  // Diminuir quantidade (remove do carrinho se quantidade ficar 0)
  function diminuirQtd(id) {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === id) {
            return { ...item, quantidade: item.quantidade - 1 };
          }
          return item;
        })
        .filter((item) => item.quantidade > 0)
    );
  }

  // Remover item especifico
  function removerDoCarrinho(id) {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  }

  // Limpar todo o carrinho
  async function limparCarrinho() {
    setCart([]);
    try {
      await AsyncStorage.removeItem(CART_STORAGE_KEY);
    } catch (err) {
      console.error("Erro ao limpar AsyncStorage:", err);
    }
  }

  // Salvar novo endereço no perfil do usuário
  async function salvarEndereco(novoEndereco) {
    const uId = user && user.uid ? user.uid : "anonimo";
    const enderecoComData = {
      ...novoEndereco,
      criadoEm: new Date().toISOString(),
    };

    if (uId !== "anonimo") {
      const novoEndRef = push(ref(database, `usuarios/${uId}/enderecos`));
      await set(novoEndRef, enderecoComData);
      return { id: novoEndRef.key, ...enderecoComData };
    } else {
      const tempId = Date.now().toString();
      const endObj = { id: tempId, ...enderecoComData };
      setEnderecos((prev) => [...prev, endObj]);
      return endObj;
    }
  }

  // Remover endereço salvo
  async function removerEndereco(id) {
    const uId = user && user.uid ? user.uid : "anonimo";
    if (uId !== "anonimo") {
      await remove(ref(database, `usuarios/${uId}/enderecos/${id}`));
    } else {
      setEnderecos((prev) => prev.filter((item) => item.id !== id));
    }
  }

  // Deslogar usuário
  async function deslogar() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao deslogar:", error);
    }
  }

  // Calcular valor total de todos os itens do carrinho
  const cartTotal = cart.reduce((acc, item) => {
    const adicionaisTotal = (item.adicionais || []).reduce(
      (sum, add) => sum + (add.preco || 0),
      0
    );
    return acc + (item.preco + adicionaisTotal) * item.quantidade;
  }, 0);

  // Calcular quantidade total de itens no carrinho
  const cartCount = cart.reduce((acc, item) => acc + item.quantidade, 0);

  // Enviar pedido para o Firebase Realtime Database com o ID do usuário e o Endereço
  async function finalizarPedido(enderecoEntrega) {
    if (cart.length === 0) {
      throw new Error("O carrinho está vazio!");
    }
    const uId = user && user.uid ? user.uid : "anonimo";
    const userEmail = user && user.email ? user.email : "";
    const pedido = {
      userId: uId,
      userEmail,
      itens: cart,
      total: cartTotal,
      endereco: enderecoEntrega || null,
      dataCriacao: new Date().toISOString(),
      status: "pendente_pagamento",
    };

    // Salvar pedido na coleção "pedidos"
    const novoPedidoRef = push(ref(database, "pedidos"));
    await set(novoPedidoRef, pedido);

    // Salvar também no perfil do usuário se estiver logado
    if (uId !== "anonimo") {
      const userPedidoRef = push(ref(database, `usuarios/${uId}/pedidos`));
      await set(userPedidoRef, pedido);
    }

    return novoPedidoRef.key;
  }

  async function atualizarStatusPedido(pedidoId, novoStatus, metadata = {}) {
    if (!pedidoId) return;

    try {
      const pedidoRef = ref(database, `pedidos/${pedidoId}`);
      await update(pedidoRef, {
        status: novoStatus,
        ...metadata,
        atualizadoEm: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Erro ao atualizar status do pedido:", error);
    }
  }

  const userId = user && user.uid ? user.uid : null;

  return (
    <GlobalContext.Provider
      value={{
        cart,
        user,
        userId,
        enderecos,
        loadingCart,
        loadingEnderecos,
        addToCart,
        aumentarQtd,
        diminuirQtd,
        removerDoCarrinho,
        limparCarrinho,
        salvarEndereco,
        removerEndereco,
        deslogar,
        cartTotal,
        cartCount,
        finalizarPedido,
        atualizarStatusPedido,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
}

export function useGlobalContext() {
  return useContext(GlobalContext);
}
