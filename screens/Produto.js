import React, { useMemo, useState, useEffect, } from "react";

import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from '@react-navigation/native-stack';

export default function Produto({route}) {

  const navigation = useNavigation();

  

  console.log("ROUTE:", route);
  console.log("PARAMS:", route?.params);

  const { nome, descricao, preco, imagem, adicionais } = route?.params || {};

  console.log("valor de redirect: ", nome, descricao, preco, adicionais)

  const [extras, setExtras] = useState(() => {
    return Object.entries(adicionais || {}).map(([nome, preco], index) => ({
      id: index + 1,
      nome,
      preco,
      checked: false,
    }));
  });

  const [remover, setRemover] = useState(() => {
    return (descricao || "")
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .map((nome, index) => ({
        id: index + 1,
        nome,
        checked: false,
      }));
  });

  const [observacao, setObservacao] = useState("");
  const [quantidade, setQuantidade] = useState(1);

  function toggleExtra(id) {
    const selecionados = extras.filter((i) => i.checked).length;

    setExtras((old) =>
      old.map((item) => {
        if (item.id !== id) return item;

        if (!item.checked && selecionados >= 5) {
          return item;
        }

        return {
          ...item,
          checked: !item.checked,
        };
      })
    );
  }

  function toggleRemover(id) {
    setRemover((old) =>
      old.map((item) =>
        item.id === id
          ? { ...item, checked: !item.checked }
          : item
      )
    );
  }

  const total = useMemo(() => {
    const extrasTotal = extras
      .filter((i) => i.checked)
      .reduce((acc, item) => acc + item.preco, 0);

    return (preco + extrasTotal) * quantidade;
  }, [extras, quantidade]);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <Image
          source={{ uri:imagem }}
          style={styles.image}
        />

        <View style={styles.content}>

          <Text style={styles.title}>{nome}</Text>

          <Text style={styles.description}>
            {descricao}
          </Text>

          

          <Text style={styles.price}>
            R$ {preco.toFixed(2).replace(".", ",")}
          </Text>

          <View style={styles.separator} />

          <Text style={styles.sectionTitle}>
            Monte seu lanche
          </Text>

          <Text style={styles.subtitle}>
            Escolha até 5 ingredientes
          </Text>

          {extras.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.option}
              onPress={() => toggleExtra(item.id)}
            >
              <Text style={styles.checkbox}>
                {item.checked ? "☑" : "☐"}
              </Text>

              <Text style={styles.optionText}>
                {item.nome}
              </Text>

              <Text style={styles.optionPrice}>
                + R$ {item.preco.toFixed(2).replace(".", ",")}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.separator} />

          <Text style={styles.sectionTitle}>
            Retirar ingredientes
          </Text>

          {remover.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.option}
              onPress={() => toggleRemover(item.id)}
            >
              <Text style={styles.checkbox}>
                {item.checked ? "☑" : "☐"}
              </Text>

              <Text style={styles.optionText}>
                {item.nome}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.separator} />

          <Text style={styles.sectionTitle}>
            Observações
          </Text>

          <TextInput
            style={styles.input}
            multiline
            placeholder="Ex.: carne ao ponto"
            value={observacao}
            onChangeText={setObservacao}
          />

          <View style={styles.separator} />

          <Text style={styles.sectionTitle}>
            Quantidade
          </Text>

          <View style={styles.quantityContainer}>

            <TouchableOpacity
              style={styles.qtyButton}
              onPress={() =>
                quantidade > 1 &&
                setQuantidade(quantidade - 1)
              }
            >
              <Text style={styles.qtyText}>-</Text>
            </TouchableOpacity>

            <Text style={styles.quantity}>
              {quantidade}
            </Text>

            <TouchableOpacity
              style={styles.qtyButton}
              onPress={() =>
                setQuantidade(quantidade + 1)
              }
            >
              <Text style={styles.qtyText}>+</Text>
            </TouchableOpacity>

          </View>

          <View style={styles.separator} />

          <Text style={styles.totalLabel}>
            Total
          </Text>

          <Text style={styles.total}>
            R$ {total.toFixed(2).replace(".", ",")}
          </Text>

        </View>

      </ScrollView>

      <TouchableOpacity style={styles.button}
        onPress={() => 
          navigation.navigate("Carrinho", {
            nome: nome,
            removidos: remover,
            preco: preco,
            imagem: imagem,
            adicionais: extras,
            quantidade: quantidade
          })
        }
      >
        <Text style={styles.buttonText}>
          Adicionar ao carrinho
        </Text>

        <Text style={styles.buttonPrice}>
          R$ {total.toFixed(2).replace(".", ",")}
        </Text>
      </TouchableOpacity>

    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },

  image: {
    width: "100%",
    height: 280,
  },

  content: {
    padding: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#222",
  },

  description: {
    marginTop: 10,
    color: "#666",
    fontSize: 16,
    lineHeight: 24,
  },

  rating: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
  },

  price: {
    marginTop: 12,
    fontSize: 28,
    fontWeight: "bold",
    color: "#6B3FE4",
  },

  separator: {
    marginVertical: 24,
    height: 1,
    backgroundColor: "#ECECEC",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },

  subtitle: {
    color: "#777",
    marginTop: 6,
    marginBottom: 15,
  },

  option: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  checkbox: {
    fontSize: 22,
    marginRight: 15,
  },

  optionText: {
    flex: 1,
    fontSize: 16,
  },

  optionPrice: {
    color: "#666",
    fontWeight: "600",
  },

  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    padding: 15,
    minHeight: 100,
    textAlignVertical: "top",
  },

  quantityContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  qtyButton: {
    width: 45,
    height: 45,
    borderRadius: 10,
    backgroundColor: "#6B3FE4",
    justifyContent: "center",
    alignItems: "center",
  },

  qtyText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 22,
  },

  quantity: {
    marginHorizontal: 30,
    fontSize: 22,
    fontWeight: "bold",
  },

  totalLabel: {
    fontSize: 18,
    color: "#666",
  },

  total: {
    marginTop: 8,
    fontSize: 30,
    fontWeight: "bold",
    color: "#6B3FE4",
  },

  button: {
    backgroundColor: "#6B3FE4",
    paddingVertical: 18,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 18,
  },

  buttonPrice: {
    color: "#FFF",
    marginTop: 5,
    fontSize: 16,
  },
});