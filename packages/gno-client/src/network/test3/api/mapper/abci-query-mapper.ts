import { GnoClientResnpose } from '../../../../api';
import { AbciQuery } from '../response';

export class AbciQueryMapper {
  public static toAbciQuery = (
    response: AbciQuery,
  ): GnoClientResnpose.AbciQuery => {
    let mappedReponse = { ...response };
    const queryData = mappedReponse.response.ResponseBase?.Data;
    if (queryData !== null) {
      const plainData = Buffer.from(queryData, 'base64').toString();
      mappedReponse.response.ResponseBase.Data = plainData;;
    }

    return mappedReponse.response;
  }
}