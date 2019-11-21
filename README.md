tokenism
--------
A very strange tool for describing tokens, how to use it's only to you!

```sh
npm i --save tokenism
```

### How to use

```ts
import { createToken } from 'tokenism';

const token = createToken('token', 'Any token', () => Math.random().toString());

token.name();    // "token"
token.caption(); // "Any token"

token.value(); // "0.31454363456"
token.value(); // "0.12476585686"
token.value(); // "0.68209487562"

token.toJSON();
// {
//    name: "token",
//    caption: "Any token",
//    value: "0.68209487562",
//    optional: false,
// }

// Shorty
const tok = token.as('tok');
tok.name();    // "tok"
tok.caption(); // "Any token"

// Shorty with caption
const shortyTok = tok.as(null, 'Shorty token');
shortyTok.name();    // "tok"
shortyTok.caption(); // "Shorty token"
```

---

### Composite token

```ts
import { createToken, composeTokens } from 'tokenism';

const unread = createToken('unread', 'Unread flag', () => Math.random() > .5);
const pinned = createToken('pinnd', 'Pinned flag', () => Math.random() > .5);
const flags = createToken('flags', 'Flags object', composeTokens(
	unread,
	pinned,
));

flags.value();
// {
//   unread: true,
//   pinned: false,
// }

flags.toJSON();
// {
//    name: "flags",
//    caption: "Flags object",
//    value: "0.68209487562",
//    optional: false,
// }
```

---

### API

- **createToken**(name: `string`, caption: `string`, generator: `() => T`): `Token`
- **composeTokens**(...tokens: `Token[]`): `CompositeTokenValue`

---

### Token

Instance method

- **as**(newName: `string | null`, newCaption?: `string | null`, newValue?: `T | (() => T)`): `Token`
- **optional**(newCaption?: `string | null`, newValue?: `T | (() => T)`): `Token`
- **name**(): `string`
- **caption**(): `string`
- **value**(): `T`
- **toJSON**(): `object`

---

### Development

 - `npm i`
 - `npm test`, [code coverage](./coverage/lcov-report/index.html)
