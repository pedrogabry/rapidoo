import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TextInput,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { ref, get, onValue } from "firebase/database";
import { database } from "../firebaseConfig";
import { useGlobalContext } from "../context/GlobalContext";

const categories = [
  { id: "1", name: "Hambúrguer", icon: "🍔" },
  { id: "2", name: "Pizza", icon: "🍕" },
  { id: "3", name: "Japonesa", icon: "🍣" },
  { id: "4", name: "Açaí", icon: "🥤" },
  { id: "5", name: "Mercado", icon: "🛒" },
];

function normalizeCategoryName(categoryKey) {
  const value = (categoryKey || "").toLowerCase();

  switch (value) {
    case "hamburguer":
    case "hamburgues":
    case "hamburgers":
    case "burger":
    case "burguer":
      return "Hambúrguer";
    case "pizza":
    case "pizzas":
      return "Pizza";
    case "japonesa":
    case "japonesas":
    case "sushi":
      return "Japonesa";
    case "açaí":
    case "acai":
    case "acaí":
      return "Açaí";
    case "mercado":
    case "mercados":
      return "Mercado";
    default:
      return categoryKey || "Outros";
  }
}

export default function Home() {
  const [restaurants, setRestaurants] = useState([]);
  const [listaRestaurantes, setlistaRestaurantes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);

  const navigation = useNavigation();
  const { userId, enderecos } = useGlobalContext();

  // Pegar o endereço principal do usuário
  const enderecoAtual =
    enderecos && enderecos.length > 0 ? enderecos[0] : null;

  function getEnderecoTexto() {
    if (!enderecoAtual) return "📍 Cadastrar Endereço";
    const ruaNum = `${enderecoAtual.rua || ""}, ${enderecoAtual.numero || ""}`;
    const bairro = enderecoAtual.bairro ? ` - ${enderecoAtual.bairro}` : "";
    const texto = `📍 ${ruaNum}${bairro}`;
    return texto.length > 32 ? texto.slice(0, 30) + "..." : texto;
  }

  async function loadRestaurants() {
    try {
      const nomesDasColecoes = ["restaurantes", "restaurante"];
      let dadosRestaurantes = null;

      for (const chave of nomesDasColecoes) {
        const snapshot = await get(ref(database, chave));
        if (snapshot.exists()) {
          dadosRestaurantes = snapshot.val();
          break;
        }
      }

      if (!dadosRestaurantes) {
        setRestaurants([]);
        setFiltered([]);
        setlistaRestaurantes([]);
        return;
      }

      const data = [];
      const lista = [];

      Object.entries(dadosRestaurantes).forEach(([id, dados]) => {
        if (!dados || typeof dados !== "object") return;

        const restauranteNome = dados.nome || dados.name || id;
        lista.push({
          id,
          nome: restauranteNome,
          logo: dados.logo || dados.imagem || dados.foto,
        });

        const cardapio = dados.cardapio || {};

        Object.entries(cardapio).forEach(([categoriaKey, categoriaItens]) => {
          if (!categoriaItens || typeof categoriaItens !== "object") return;

          const itens = categoriaItens;
          const temEstruturaProduto =
            typeof itens.nome === "string" ||
            typeof itens.descricao === "string" ||
            typeof itens.preco === "number" ||
            typeof itens.imagem === "string";

          if (temEstruturaProduto) {
            const preco = Number(itens.preco);
            data.push({
              id: `${id}-${categoriaKey}`,
              restauranteId: id,
              restauranteNome,
              categoria: categoriaKey,
              categoriaLabel: normalizeCategoryName(categoriaKey),
              nome: itens.nome,
              descricao: itens.descricao,
              preco: Number.isFinite(preco) ? preco : 0,
              imagem: itens.imagem,
              adicionais: itens.adicionais,
            });
            return;
          }

          Object.entries(itens).forEach(([itemId, produto]) => {
            if (!produto || typeof produto !== "object") return;
            if (!produto.nome && !produto.descricao) return;

            const preco = Number(produto.preco);

            data.push({
              id: `${id}-${itemId}`,
              restauranteId: id,
              restauranteNome,
              categoria: categoriaKey,
              categoriaLabel: normalizeCategoryName(categoriaKey),
              nome: produto.nome,
              descricao: produto.descricao,
              preco: Number.isFinite(preco) ? preco : 0,
              imagem: produto.imagem,
              adicionais: produto.adicionais,
            });
          });
        });
      });

      data.sort((a, b) => a.preco - b.preco || a.nome.localeCompare(b.nome));

      setRestaurants(data);
      setFiltered(data);
      setlistaRestaurantes(lista);
    } catch (error) {
      console.log("Erro ao buscar restaurantes:", error);
    }
  }

  useEffect(() => {
    loadRestaurants();
  }, []);

  // Escutar pedidos do usuário em tempo real
  useEffect(() => {
    const pedidosRef = ref(database, "pedidos");
    const unsubscribe = onValue(
      pedidosRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const activeList = Object.entries(data)
            .map(([id, p]) => ({ id, ...p }))
            .filter((p) => {
              const isUserMatch = userId ? p.userId === userId : true;
              const status = (p.status || "").toLowerCase();
              const isActive =
                status !== "entregue" &&
                status !== "concluido" &&
                status !== "cancelado";
              return isUserMatch && isActive;
            })
            .sort(
              (a, b) =>
                new Date(b.dataCriacao || 0) - new Date(a.dataCriacao || 0)
            );

          setActiveOrder(activeList.length > 0 ? activeList[0] : null);
          setActiveOrdersCount(activeList.length);
        } else {
          setActiveOrder(null);
          setActiveOrdersCount(0);
        }
      },
      (error) => {
        console.error("Erro ao escutar pedidos ativos na Home:", error);
      }
    );
    return () => unsubscribe();
  }, [userId]);

  function handleSearch(text) {
    setSearch(text);
    if (text.trim() === "") {
      setFiltered(restaurants);
      return;
    }
    const result = restaurants.filter((item) =>
      (item.nome || "")
        .toLowerCase()
        .includes(text.toLowerCase()) ||
      (item.descricao || "")
        .toLowerCase()
        .includes(text.toLowerCase()) ||
      (item.restauranteNome || "")
        .toLowerCase()
        .includes(text.toLowerCase())
    );
    setFiltered(result);
  }

  function handleCategory(category) {
    if (selectedCategory === category) {
      setSelectedCategory(null);
      setFiltered(restaurants);
      return;
    }
    setSelectedCategory(category);
    const result = restaurants.filter((item) => item.categoriaLabel === category);
    setFiltered(result);
  }

  function getStatusText(statusKey) {
    const st = (statusKey || "realizado").toLowerCase();
    if (st === "preparacao" || st === "preparando") return "Em preparação 👨‍🍳";
    if (st === "entrega" || st === "a caminho") return "Saiu para entrega 🛵";
    if (st === "entregue") return "Entregue 🎉";
    return "Pedido Confirmado 📝";
  }

  async function abrirPrimeiroProduto(restaurante) {
    if (!restaurante) return;

    try {
      const idsParaTentar = [];
      if (restaurante.id) idsParaTentar.push(restaurante.id);
      if (restaurante.name) idsParaTentar.push(restaurante.name);
      if (restaurante.nome) idsParaTentar.push(restaurante.nome);

      let dados = null;
      let chaveEncontrada = null;

      for (const chave of idsParaTentar) {
        const snapshot = await get(ref(database, `restaurantes/${chave}`));
        if (snapshot.exists()) {
          dados = snapshot.val();
          chaveEncontrada = chave;
          break;
        }
      }

      if (!dados) {
        navigation.navigate("Restaurantes", { id: restaurante.id || restaurante.name });
        return;
      }

      const categorias = Object.entries(dados.cardapio || {});
      let produtoInicial = null;

      for (const [, itens] of categorias) {
        const itemEncontrado = Object.entries(itens || {}).find(
          ([, produto]) => produto && (produto.nome || produto.descricao)
        );

        if (itemEncontrado) {
          const [produtoId, produto] = itemEncontrado;
          produtoInicial = { id: produtoId, ...produto };
          break;
        }
      }

      if (produtoInicial) {
        navigation.navigate("Produto", {
          nome: produtoInicial.nome,
          descricao: produtoInicial.descricao,
          preco: produtoInicial.preco,
          imagem: produtoInicial.imagem,
          adicionais: produtoInicial.adicionais,
        });
      } else {
        navigation.navigate("Restaurantes", { id: chaveEncontrada || restaurante.id || restaurante.name });
      }
    } catch (error) {
      console.log("Erro ao abrir produto inicial:", error);
      navigation.navigate("Restaurantes", { id: restaurante.id || restaurante.name });
    }
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate("Perfil")}
          activeOpacity={0.7}
        >
          <Text style={styles.location}>{getEnderecoTexto()}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.profile}
          onPress={() => navigation.navigate("Perfil")}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 18 }}>👤</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        placeholder="Buscar restaurantes ou comidas..."
        style={styles.search}
        value={search}
        onChangeText={handleSearch}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}
      >
        {/* CARD DE PEDIDO EM ANDAMENTO */}
        {activeOrder && (
          <TouchableOpacity
            style={styles.activeOrderCard}
            activeOpacity={0.88}
            onPress={() =>
              navigation.navigate("AcompanhamentoPedido", {
                pedidoId: activeOrder.id,
              })
            }
          >
            <View style={styles.activeOrderContent}>
              <View style={styles.activeOrderIconBox}>
                <Text style={styles.activeOrderIcon}>🛵</Text>
              </View>
              <View style={styles.activeOrderTextContainer}>
                <View style={styles.activeOrderHeaderRow}>
                  <Text style={styles.activeOrderTitle}>
                    {activeOrdersCount > 1
                      ? `${activeOrdersCount} pedidos em andamento`
                      : "Pedido em andamento"}
                  </Text>
                  <Text style={styles.activeOrderBadge}>30-45 min</Text>
                </View>
                <Text style={styles.activeOrderSub}>
                  {getStatusText(activeOrder.status)}
                </Text>
                <Text style={styles.activeOrderLink}>
                  Acompanhar entrega ›
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* CATEGORIAS */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleCategory(item.name)}
              style={[
                styles.category,
                selectedCategory === item.name && styles.categorySelected,
              ]}
            >
              <Text
                style={[
                  selectedCategory === item.name && styles.categoryTextSelected,
                ]}
              >
                {item.icon} {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Entrega rápida 🚀</Text>
          <Text style={styles.bannerText}>
            Os melhores restaurantes perto de você
          </Text>
        </View>

        <Text style={styles.title}>Lanches mais baratos</Text>

        {Object.entries(
          filtered.reduce((acc, item) => {
            if (!acc[item.categoriaLabel]) {
              acc[item.categoriaLabel] = [];
            }
            acc[item.categoriaLabel].push(item);
            return acc;
          }, {})
        ).map(([categoria, itens]) => (
          <View key={categoria} style={styles.groupSection}>
            <Text style={styles.groupTitle}>{categoria}</Text>
            {itens.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.productCard}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate("Produto", {
                    nome: item.nome,
                    descricao: item.descricao,
                    preco: item.preco,
                    imagem: item.imagem,
                    adicionais: item.adicionais,
                  })
                }
              >
                {item.imagem ? (
                  <Image source={{ uri: item.imagem }} style={styles.productImage} />
                ) : null}
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.nome}</Text>
                  <Text style={styles.productRestaurant}>{item.restauranteNome}</Text>
                  <Text style={styles.productDescription} numberOfLines={2}>
                    {item.descricao}
                  </Text>
                  <Text style={styles.productPrice}>
                    R$ {item.preco.toFixed(2).replace(".", ",")}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <Text style={styles.texto_restaurantes_titulo}>Restaurantes</Text>
        {listaRestaurantes.map((item) => (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("Restaurantes", {
                id: item.id,
              })
            }
            style={styles.listarestaurantes}
            key={item.id}
          >
            <Image
              source={{ uri: item.logo }}
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: "blue",
              }}
            />
            <Text style={styles.textorestaurantes}>{item.nome}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 15,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  location: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  profile: {
    backgroundColor: "#eee",
    padding: 10,
    borderRadius: 50,
  },
  search: {
    backgroundColor: "#f2f2f2",
    padding: 15,
    borderRadius: 12,
    marginVertical: 15,
  },
  activeOrderCard: {
    backgroundColor: "#EFE8FD",
    borderColor: "#6B3FE4",
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#6B3FE4",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  activeOrderContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  activeOrderIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#6B3FE4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activeOrderIcon: {
    fontSize: 22,
  },
  activeOrderTextContainer: {
    flex: 1,
  },
  activeOrderHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activeOrderTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#222",
  },
  activeOrderBadge: {
    backgroundColor: "#6B3FE4",
    color: "#FFF",
    fontSize: 11,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeOrderSub: {
    fontSize: 13,
    color: "#6B3FE4",
    fontWeight: "600",
    marginTop: 2,
  },
  activeOrderLink: {
    fontSize: 12,
    color: "#555",
    fontWeight: "bold",
    marginTop: 4,
  },
  category: {
    backgroundColor: "#eee",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  categorySelected: {
    backgroundColor: "#6b3fe4",
  },
  categoryTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  banner: {
    backgroundColor: "#6b3fe4",
    padding: 20,
    borderRadius: 15,
    marginVertical: 20,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  bannerText: {
    color: "#fff",
    marginTop: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  groupSection: {
    marginBottom: 18,
  },
  groupTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#6b3fe4",
    marginBottom: 10,
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: "#f8f8f8",
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#222",
  },
  productRestaurant: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },
  productDescription: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  productPrice: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "bold",
    color: "#6b3fe4",
  },
  listarestaurantes: {
    backgroundColor: "#e7e3e33b",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 10,
    borderRadius: 10,
  },
  texto_restaurantes_titulo: {
    margin: 20,
    fontSize: 18,
    fontWeight: "bold",
  },
  textorestaurantes: {
    marginLeft: 20,
    fontSize: 15,
    fontWeight: "bold",
  },
});
