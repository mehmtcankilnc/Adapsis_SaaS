import dns from "node:dns";
import { Agent, setGlobalDispatcher } from "undici";

/**
 * Bazı Windows makinelerinde Node'un `dns.lookup()` (OS'un getaddrinfo
 * çağrısına dayanır, fetch/undici tarafından varsayılan olarak kullanılır)
 * belirli hostlar için süresiz askıda kalabiliyor — DNS sorgusu Node'un
 * kendi çözümleyicisiyle (`dns.resolve4`/`resolve6`, ham DNS sorgusu, OS
 * çözümleyicisini atlar) anında dönerken `dns.lookup()` hiç dönmüyor. Bu,
 * Supabase'e (ve genel olarak fetch'e) yapılan tüm isteklerin
 * "ConnectTimeoutError" ile 10s'de zaman aşımına uğramasına sebep oluyordu.
 * Global fetch dispatcher'ının DNS çözümlemesini `resolve4`/`resolve6`
 * kullanacak şekilde değiştirmek bu askıda kalmayı ortadan kaldırır.
 * undici, lookup callback'ini `{ all: true }` seçeneğiyle çağırır ve
 * `[{ address, family }]` dizisi bekler (klasik `dns.lookup`'ın
 * `(err, address, family)` imzasından farklı).
 *
 * `resolve4`/`resolve6` genel DNS sorgusu yaptığından `localhost` veya
 * hosts dosyasındaki girdiler gibi adresleri çözemez (ENOTFOUND) — bu
 * yüzden ikisi de başarısız olduğunda OS'un varsayılan `dns.lookup`'ına
 * düşülür (bu tür yerel adreslerde askıda kalma riski gözlenmedi).
 */
function resolveLookup(
  hostname: string,
  _options: unknown,
  callback: (err: NodeJS.ErrnoException | null, addresses: { address: string; family: number }[]) => void,
) {
  dns.resolve4(hostname, (err4, v4) => {
    if (!err4 && v4.length > 0) {
      callback(null, v4.map((address) => ({ address, family: 4 })));
      return;
    }
    dns.resolve6(hostname, (err6, v6) => {
      if (!err6 && v6.length > 0) {
        callback(null, v6.map((address) => ({ address, family: 6 })));
        return;
      }
      dns.lookup(hostname, { all: true }, callback);
    });
  });
}

setGlobalDispatcher(
  new Agent({
    connect: { lookup: resolveLookup },
  }),
);
