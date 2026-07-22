import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from "react-native";
import { useRoute } from "@react-navigation/native";

export default function Carrinho() {
  const route = useRoute();

  const {
    nome,
    preco,
    imagem,
    adicionais,
    removidos,
    quantidade,
  } = route.params;

  const [cart, setCart] = useState([
    {
      id: Date.now(),
      nome,
      preco,
      imagem,
      adicionais,
      removidos,
      quantidade,
    },
  ]);

  function aumentar(id) {
    setCart((old) =>
      old.map((item) =>
        item.id === id
          ? { ...item, quantidade: item.quantidade + 1 }
          : item
      )
    );
  }

  function diminuir(id) {
    setCart((old) =>
      old
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantidade: item.quantidade - 1,
              }
            : item
        )
        .filter((item) => item.quantidade > 0)
    );
  }

  function remover(id) {
    Alert.alert(
      "Remover item",
      "Deseja remover este item do carrinho?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Remover",
          onPress: () =>
            setCart((old) => old.filter((item) => item.id !== id)),
        },
      ]
    );
  }

  const total = useMemo(() => {
    return cart.reduce((acc, item) => {
      const adicionais = item.adicionais.reduce(
        (soma, add) => soma + add.preco,
        0
      );

      return (
        acc +
        (item.preco + adicionais) * item.quantidade
      );
    }, 0);
  }, [cart]);

  function renderItem({ item }) {
    return (
      <View style={styles.card}>
        <Image
          source={{ uri: item.imagem }}
          style={styles.image}
        />

        <View style={styles.info}>
          <Text style={styles.nome}>{item.nome}</Text>

          <Text style={styles.preco}>
            R$ {item.preco.toFixed(2)}
          </Text>

          {item.adicionais.length > 0 && (
            <>
              <Text style={styles.titulo}>
                Adicionais
              </Text>

              {item.adicionais.map((add, index) => (
                <Text
                  key={index}
                  style={styles.extra}
                >
                  • {add.nome} (+R$ {add.preco.toFixed(2)})
                </Text>
              ))}
            </>
          )}

          {item.removidos.length > 0 && (
            <>
              <Text style={styles.titulo}>
                Removidos
              </Text>

              <Text style={styles.removido}>
                {item.removidos.join(", ")}
              </Text>
            </>
          )}

          <View style={styles.bottom}>
            <View style={styles.quantidade}>
              <TouchableOpacity
                onPress={() => diminuir(item.id)}
                style={styles.botaoQtd}
              >
                <Text style={styles.qtdText}>-</Text>
              </TouchableOpacity>

              <Text style={styles.numero}>
                {item.quantidade}
              </Text>

              <TouchableOpacity
                onPress={() => aumentar(item.id)}
                style={styles.botaoQtd}
              >
                <Text style={styles.qtdText}>+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => remover(item.id)}
            >
              <Text style={styles.remover}>
                Remover
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={cart}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 15,
          paddingBottom: 170,
        }}
      />

      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>
            Total
          </Text>

          <Text style={styles.total}>
            R$ {total.toFixed(2)}
          </Text>
        </View>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>
            Continuar
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 15,
    overflow: "hidden",
    elevation: 2,
  },

  image: {
    width: 110,
    height: 110,
  },

  info: {
    flex: 1,
    padding: 12,
  },

  nome: {
    fontSize: 17,
    fontWeight: "700",
  },

  preco: {
    fontSize: 17,
    color: "#6B3FE4",
    fontWeight: "bold",
    marginTop: 3,
  },

  titulo: {
    marginTop: 8,
    fontWeight: "600",
    color: "#555",
  },

  extra: {
    color: "#666",
    marginTop: 2,
  },

  removido: {
    color: "#d9534f",
    marginTop: 2,
  },

  bottom: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  quantidade: {
    flexDirection: "row",
    alignItems: "center",
  },

  botaoQtd: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#6B3FE4",
    justifyContent: "center",
    alignItems: "center",
  },

  qtdText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },

  numero: {
    marginHorizontal: 15,
    fontWeight: "bold",
    fontSize: 16,
  },

  remover: {
    color: "#E53935",
    fontWeight: "700",
  },

  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
    padding: 18,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 20,
  },

  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  totalText: {
    fontSize: 18,
    fontWeight: "600",
  },

  total: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#6B3FE4",
  },

  button: {
    backgroundColor: "#6B3FE4",
    height: 55,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});