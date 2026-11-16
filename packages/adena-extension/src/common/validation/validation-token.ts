import { GRC20TokenModel, NativeTokenModel, TokenModel } from '@types';

export function isNativeTokenModel(model: TokenModel): model is NativeTokenModel {
  return model.type === 'gno-native';
}

export function isGRC20TokenModel(model: TokenModel): model is GRC20TokenModel {
  return model.type === 'grc20';
}

// No dedicated CosmosNativeTokenModel interface exists yet, so this is a plain
// boolean predicate rather than a narrowing type guard. It still gives the
// 'cosmos-native' discriminator a single home instead of scattering the literal.
export function isCosmosNativeTokenModel(model: TokenModel): boolean {
  return model.type === 'cosmos-native';
}
