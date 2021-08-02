import { MilvusClient } from "../milvus/index";
import { GENERATE_NAME, IP } from "../const";
import { DataType } from "../milvus/types/Common";
import { generateInsertData } from "../utils";
import { InsertReq } from "../milvus/types/Insert";
const milvusClient = new MilvusClient(IP);
const COLLECTION_NAME = GENERATE_NAME();

const test = async () => {
  await milvusClient.createCollection({
    collection_name: COLLECTION_NAME,
    fields: [
      {
        name: "float_vector",
        description: "vector field",
        data_type: DataType.FloatVector,
        type_params: [
          {
            key: "dim",
            value: "4",
          },
        ],
      },
      {
        name: "age",
        data_type: DataType.Int64,
        autoID: false,
        is_primary_key: true,
        description: "",
      },
      {
        name: "time",
        data_type: DataType.Int32,
        description: "",
      },
      {
        name: "c",
        data_type: DataType.Int32,
        description: "",
      },
    ],
  });

  const fields = [
    {
      isVector: true,
      dim: 4,
      name: "float_vector",
    },
    {
      isVector: false,
      name: "age",
    },
    {
      isVector: false,
      name: "time",
    },
    {
      isVector: false,
      name: "c",
    },
  ];
  const vectorsData = generateInsertData(fields, 10);

  const params: InsertReq = {
    collection_name: COLLECTION_NAME,
    fields_data: vectorsData,
  };
  await milvusClient.insert(params);
  await milvusClient.flush({ collection_names: [COLLECTION_NAME] });

  const indexRes = await milvusClient.createIndex({
    collection_name: COLLECTION_NAME,
    field_name: "float_vector",

    extra_params: [
      {
        key: "index_type",
        value: "ANNOY",
      },
      {
        key: "metric_type",
        value: "IP",
      },
      {
        key: "params",
        value: JSON.stringify({ n_trees: 1024 }),
      },
    ],
  });
  console.log(indexRes);
  // need load collection before search
  await milvusClient.loadCollection({
    collection_name: COLLECTION_NAME,
  });
  const result = await milvusClient.search({
    collection_name: COLLECTION_NAME,
    // partition_names: [],
    expr: "age < 8 && c < 4 || c > 3 && time < 5",
    vectors: [[4, 10, 4, 1]],
    search_params: [
      { key: "anns_field", value: "float_vector" },
      { key: "topk", value: "4" },
      { key: "metric_type", value: "Jaccard" },
      { key: "params", value: JSON.stringify({ nprobe: 1024 }) },
    ],
    output_fields: ["age", "time", "c"],
    vector_type: DataType.FloatVector,
  });
  console.log("search result", result);
  await milvusClient.dropCollection({ collection_name: COLLECTION_NAME });
};

test();