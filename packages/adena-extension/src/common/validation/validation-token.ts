import {
  GRC20TokenModel,
  IBCNativeTokenModel,
  IBCTokenModel,
  NativeTokenModel,
  TokenModel,
} from '@types';

export function isNativeTokenModel(model: TokenModel): model is NativeTokenModel {
  return model.type === 'gno-native';
}

export function isGRC20TokenModel(model: TokenModel): model is GRC20TokenModel {
  return model.type === 'grc20';
}

export function isIBCNativeTokenModel(model: TokenModel): model is IBCNativeTokenModel {
  return model.type === 'ibc-native';
}

export function isIBCTokenModel(model: TokenModel): model is IBCTokenModel {
  return model.type === 'ibc-tokens';
}
