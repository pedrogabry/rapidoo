import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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

import {
  ref,
  get,
} from "firebase/database";

import { database } from "../firebaseConfig";
import { db } from "../firebaseConfig";


const categories = [
  {
    id: "1",
    name: "Hambúrguer",
    icon: "🍔",
  },
  {
    id: "2",
    name: "Pizza",
    icon: "🍕",
  },
  {
    id: "3",
    name: "Japonesa",
    icon: "🍣",
  },
  {
    id: "4",
    name: "Açaí",
    icon: "🥤",
  },
  {
    id: "5",
    name: "Mercado",
    icon: "🛒",
  },
];


export default function Home() {

  const [restaurants, setRestaurants] = useState([]);

  const [listaRestaurantes, setlistaRestaurantes] = useState([])

  const [filtered, setFiltered] = useState([]);

  const [search, setSearch] = useState("");

  const [selectedCategory, setSelectedCategory] = useState(null);


  const navigation = useNavigation();
  const handleSubmit = async () => {

    try {

      console.log("antes do navigate");

      navigation.navigate("Restaurantes");

      console.log("depois do navigate");

    } catch(error) {

      console.log("Erro no navigate:", error);

    }

  };
  async function loadRestaurants(){

  try{
    //traz lanches
    const snapshot = await get(
      ref(database, "restaurants")
    );

    const data = [];

    snapshot.forEach((child)=>{

      data.push({

        id: child.key,

        ...child.val(),

      });

    });

    setRestaurants(data);
    setFiltered(data);


    //traz restaurantes & cardapio
    const restaurante = await get(
      ref(database, "restaurantes")
    );

    if (restaurante.exists()) {
      const listaRestaurantes = Object.entries(restaurante.val()).map(([id, dados]) => ({
        id,
        nome: dados.name,
        logo: dados.logo
      }));

      console.log(listaRestaurantes);
      setlistaRestaurantes(listaRestaurantes)
    }


  }catch(error){

    console.log(
      "Erro ao buscar restaurantes:",
      error
    );

  }

}


  useEffect(() => {

    loadRestaurants();

  }, []);








// Pesquisa
  function handleSearch(text) {

    setSearch(text);


    if (text.trim() === "") {

      setFiltered(restaurants);

      return;

    }


    const result = restaurants.filter((item) =>

      item.name
        .toLowerCase()
        .includes(
          text.toLowerCase()
        )

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


    const result = restaurants.filter((item) =>

      item.category === category

    );


    setFiltered(result);

  }



  return (

    <View style={styles.container}>


      <View style={styles.header}>

        <Text style={styles.location}>
          📍 Uberlândia, MG
        </Text>


        <View style={styles.profile}>

          <Text>
            👤
          </Text>

        </View>

      </View>

      <TextInput

        placeholder="Buscar restaurantes ou comidas..."

        style={styles.search}

        value={search}

        onChangeText={handleSearch}

      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        
      >

        <FlatList

          horizontal

          showsHorizontalScrollIndicator={false}

          data={categories}

          keyExtractor={(item) => item.id}


          renderItem={({ item }) => (

            <TouchableOpacity

              onPress={() =>
                handleCategory(item.name)
              }


              style={[

                styles.category,

                selectedCategory === item.name &&
                styles.categorySelected

              ]}

            >

              <Text

                style={[

                  selectedCategory === item.name &&
                  styles.categoryTextSelected

                ]}

              >

                {item.icon} {item.name}

              </Text>


            </TouchableOpacity>

          )}

        />


{/* Banner */}

        <View style={styles.banner}>

          <Text style={styles.bannerTitle}>
            Entrega rápida 🚀
          </Text>


          <Text style={styles.bannerText}>
            Os melhores restaurantes perto de você
          </Text>

        </View>




        <Text style={styles.title}>
          Restaurantes perto de você
        </Text>




        <FlatList

          horizontal

          showsHorizontalScrollIndicator={false}

          data={filtered}

          keyExtractor={(item) => item.id}


          renderItem={({ item }) => (

            <View style={styles.card}>


              <Image

                source={{
                  uri: item.image,
                }}

                style={styles.image}

              />



              <Text style={styles.restaurant}>
                {item.name}
              </Text>



              <Text style={styles.info}>
                ⭐ {item.rating}
              </Text>



              <Text style={styles.info}>
                ⏱ {item.time}
              </Text>



              <Text style={styles.price}>
                R$ {item.price}
              </Text>


            </View>

          )}

        />

        <Text style={styles.texto_restaurantes_titulo}>Restaurantes</Text>

        {listaRestaurantes.map((item) => (
          <TouchableOpacity 
            onPress={() => 
              navigation.navigate("Restaurantes", {
                id: item.id
              })
            } 
            style={styles.listarestaurantes} key={item.id}
          >

            <Image
              source={{ uri: item.logo }}
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: "blue"
              }}
            />

            <Text style={styles.textorestaurantes}>
              {item.nome}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

    </View>

  );

}



const styles = StyleSheet.create({

  listarestaurantes:{
    backgroundColor: "#e7e3e33b",
    display: "flex",
    flexDirection:"row",
    alignItems: "center",
    marginBottom:10,
    marginTop: 10,
    borderRadius:10
  },
  texto_restaurantes_titulo:{
    margin:20,
    fontSize: 18,
    fontWeight: "bold",
  },
  textorestaurantes:{
    marginLeft: 20,
    fontSize: 15,
    fontWeight: "bold",
  },

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
    fontSize: 16,
    fontWeight: "bold",
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


  card: {
    width: 160,
    backgroundColor: "#fff",
    borderRadius: 15,
    marginRight: 15,
    paddingBottom: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },


  image: {
    width: 160,
    height: 110,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },


  restaurant: {
    fontSize: 16,
    fontWeight: "bold",
    padding: 8,
  },


  info: {
    paddingHorizontal: 8,
    fontSize: 13,
    color: "#555",
  },


  price: {
    paddingHorizontal: 8,
    marginTop: 5,
    fontWeight: "bold",
    fontSize: 15,
  },

});