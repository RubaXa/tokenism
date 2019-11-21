type TokenValuePrimitive = string | boolean | number;
type TokenValue =
	| string
	| boolean
	| number
	| TokenValuePrimitive[]
	| LikeToken[]
;

export type TokenValueGen = (...args: any[]) => TokenValue;
export type TokenValueCompositeFactory<
	T extends LikeToken[],
	P extends object | null,
> = ((params: P) => T) & {composite: number};

export type TokenValueFactory =
	| TokenValue
	| TokenValueGen
;

export type TokenValueInfer<T extends TokenValueFactory> = T extends () => infer R ? R : T;

type TokenValueTypedFactory<
	V extends TokenValueFactory,
	T = TokenValueInfer<V>,
> = T | ((...args: any[]) => T);

type TokenJSON<
	N extends string,
	C extends string,
	V extends TokenValueFactory,
> = {
	name: N;
	optional: boolean;
	caption: C;
	value: TokenValueInfer<V>;
	type: string;
}

type TokenFactory<
	K extends string,
	C extends string,
	V extends TokenValueFactory,
> = <
	NC extends string | null,
	NV extends TokenValueFactory | null
>(caption?: NC, value?: NV) => Token<K, Strict<NC, C>, Strict<NV, V>>;

export type Token<
	N extends string,
	C extends string,
	V extends TokenValueFactory,
> = TokenFactory<N, C, V> & {
	as: <
		NN extends string,
		NC extends string = C,
		NV extends TokenValueFactory = V,
	>(name: NN, caption?: string, value?: TokenValueTypedFactory<V>) => Token<NN, NC, NV>;

	optional: <
		NC extends string = C,
		NV extends TokenValueFactory = V,
	>(caption?: string, value?: TokenValueTypedFactory<V>) => Token<N, NC, NV>;

	name: () => N;
	caption: () => C;
	value: () => TokenValueInfer<V>;
	lastValue: () => TokenValueInfer<V>;
	toJSON: () => TokenJSON<N, C, V>;
};

type CompositeTokenFactory<
	K extends string,
	C extends string,
	V extends TokenValueCompositeFactory<any, any>,
> = <
	NC extends string | null,
>(caption?: NC, value?: CompositeTokenParams<V>) => CompositeToken<K, Strict<NC, C>, V>;

export type CompositeToken<
	N extends string,
	C extends string,
	V extends TokenValueCompositeFactory<any, any>,
> = CompositeTokenFactory<N, C, V> & {
	as: <
		NN extends string,
		NC extends string | null,
	>(name: NN, caption?: NC, value?: CompositeTokenParams<V>) => CompositeToken<NN, Strict<NC, C>, V>;

	optional: <NC extends string = C>(caption?: string,) => CompositeToken<N, NC, V>;
	name: () => N;
	caption: () => C;
	value: () => V;
	lastValue: () => V;
	toJSON: () => object;
};

export type TokenAny = Token<any, any, any>;
export type LikeToken = {name: () => string; value: () => any};

export type TokenExtra<
	C extends string,
	V extends TokenValueFactory,
> = {
	optional?: boolean;
	caption?: C;
	value?: V;
}


type CompositeTokenParam<F> = F extends TokenValueCompositeFactory<infer T, infer P>
	? P extends null ? TokenCompositeValue<T> : P
	: F
;

export type CompositeTokenParams<F> = DeepPartial<
	Cast<
		CompositeTokenParam<F>,
		object
	>
>;

export type TokenCompositeValue<T extends LikeToken[]> = (
	FlattenObject<
		ToIntersect<
			{[K in keyof T]:
				T[K] extends {name: () => infer NN, value: () => infer VV}
					? { [P in Cast<NN, string>]: CompositeTokenParam<VV> }
					: never
			}[number]
		>
	>
);

// (1) Union to Intersection (as result: {foo: 123} & {bar: 321} & ...)
type ToIntersect<U> =
	(U extends any ? (inp: U) => void : never) extends ((out: infer I) => void)
		? I
		: never
;

// (2) Make flat object again! ({foo: 123} & {bar: 321} -> {foo: 123; bar: 321})
type FlattenObject<T> = (
	T extends object
		? { [K in keyof T]: T[K] }
		: never
);

type IsNullable<T> = ToIntersect<T> extends (undefined | null) ? true : false;
type Cast<A, E> = A extends E ? A : E;
type Strict<A, E> = NonNullable<IsNullable<A> extends true ? E : A>;
type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;