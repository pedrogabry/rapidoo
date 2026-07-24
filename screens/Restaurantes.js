import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { ref, get } from "firebase/database";
import { database } from "../firebaseConfig";
import { useNavigation } from "@react-navigation/native";

export default function Restaurante({ route }) {
  const [restaurante, setRestaurante] = useState(null);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("Todos");
  const { id } = route.params || {};
  const navigation = useNavigation();

  useEffect(() => {
    async function buscarRestaurante() {
      if (!id) return;
      const snapshot = await get(ref(database, `restaurantes/${id}`));
      if (snapshot.exists()) {
        const dados = snapshot.val();
        setRestaurante(dados);
      }
    }
    buscarRestaurante();
  }, [id]);

  if (!restaurante) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Carregando...</Text>
      </View>
    );
  }

  const categorias = ["Todos", ...Object.keys(restaurante.cardapio || {})];

  const produtos = Object.entries(restaurante.cardapio || {}).flatMap(
    ([categoria, itens]) =>
      Object.entries(itens || {}).map(([id, produto]) => ({
        id,
        categoria,
        ...produto,
      }))
  );

  const produtosFiltrados =
    categoriaSelecionada === "Todos"
      ? produtos
      : produtos.filter((item) => item.categoria === categoriaSelecionada);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 90 }}
    >
      {/* BANNER */}
      <View>
        <Image source={{ uri: restaurante.baner }} style={styles.banner} />
        <Image source={{ uri: restaurante.logo }} style={styles.logo} />
      </View>

      {/* INFORMAÇÕES */}
      <View style={styles.info}>
        <Text style={styles.name}>{restaurante.nome}</Text>
        <Text style={styles.detalhes}>
          ⭐ {restaurante.avaliacao} • {restaurante.tempo}
        </Text>
        <Text style={styles.descricao}>
          Hambúrguer artesanal e comida rápida
        </Text>
      </View>

      {/* CATEGORIAS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categorias}
      >
        {categorias.map((categoria) => (
          <TouchableOpacity
            key={categoria}
            onPress={() => setCategoriaSelecionada(categoria)}
            style={[
              styles.categoria,
              categoriaSelecionada === categoria && styles.categoriaAtiva,
            ]}
          >
            <Text
              style={[
                styles.textCategoria,
                categoriaSelecionada === categoria && styles.textCategoriaAtivo,
              ]}
            >
              {categoria}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* CARDÁPIO */}
      <View style={styles.cardapio}>
        {produtosFiltrados.map((produto, index) => (
          <TouchableOpacity
            key={index}
            style={styles.produto}
            onPress={() =>
              navigation.navigate("Produto", {
                nome: produto.nome,
                descricao: produto.descricao,
                preco: produto.preco,
                imagem: produto.imagem,
                adicionais: produto.adicionais,
              })
            }
          >
            <View style={styles.produtoInfo}>
              <Text style={styles.produtoNome}>{produto.nome}</Text>
              <Text style={styles.produtoDesc}>{produto.descricao}</Text>
              <Text style={styles.preco}>
                R${" "}
                {produto.preco
                  ? produto.preco.toFixed(2).replace(".", ",")
                  : "0,00"}
              </Text>
            </View>
            <Image
              source={{ uri: produto.imagem }}
              style={styles.produtoImagem}
            />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  banner: {
    height: 220,
    width: "100%",
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 45,
    position: "absolute",
    bottom: -40,
    left: 20,
    borderWidth: 4,
    borderColor: "#fff",
  },
  info: {
    marginTop: 50,
    paddingHorizontal: 20,
  },
  name: {
    fontSize: 26,
    fontWeight: "bold",
  },
  detalhes: {
    marginTop: 8,
    color: "#666",
    fontSize: 15,
  },
  descricao: {
    marginTop: 12,
    color: "#777",
  },
  categorias: {
    marginTop: 20,
    paddingHorizontal: 15,
  },
  categoria: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: "#eee",
    marginRight: 10,
  },
  categoriaAtiva: {
    backgroundColor: "#6B3FE4",
  },
  textCategoria: {
    color: "#555",
  },
  textCategoriaAtivo: {
    color: "#fff",
    fontWeight: "bold",
  },
  cardapio: {
    padding: 15,
  },
  produto: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  produtoInfo: {
    flex: 1,
    paddingRight: 15,
  },
  produtoNome: {
    fontSize: 18,
    fontWeight: "bold",
  },
  produtoDesc: {
    color: "#777",
    marginTop: 5,
  },
  preco: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: "bold",
    color: "#6B3FE4",
  },
  produtoImagem: {
    width: 110,
    height: 110,
    borderRadius: 12,
  },
});
