import http from "k6/http";
import { sleep, group, check } from "k6";

export default function () {
  // Test senaryosu burada tanımlanır

  http.get("http://localhost:3000/createBank");

  sleep(1);
}

export const options = {
  stages: [
    { duration: "10s", target: 5 }, // 10 saniyede 5 kullanıcıya çıkarma
    { duration: "20s", target: 10 }, // Sonraki 20 saniyede 10 kullanıcıya çıkarma
    { duration: "30s", target: 20 }, // Sonraki 30 saniyede 20 kullanıcıya çıkarma
    { duration: "40s", target: 0 }, // Sonraki 40 saniyede kullanıcıları azaltma
  ],
};
