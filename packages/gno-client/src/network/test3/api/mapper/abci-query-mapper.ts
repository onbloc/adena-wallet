import { GnoClientResnpose } from '../../../../api';
import { AbciQuery } from '../response';

export class AbciQueryMapper {
  public static toAbciQuery = (
    response: AbciQuery,
  ): GnoClientResnpose.AbciQuery => {
    let mappedReponse = { ...response };
    const queryData = mappedReponse.response.ResponseBase?.Data;
    if (queryData !== null) {
      mappedReponse.response.ResponseBase.Data = atob(queryData);
    }

    return mappedReponse.response;
  }
}