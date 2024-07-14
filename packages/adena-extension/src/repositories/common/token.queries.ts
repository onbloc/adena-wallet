export const makeAllRealmsQuery = (): string => `
{
  transactions(filter: {
    success: true
    message: {
      type_url: add_package
    }
  }) {
    messages {
        value {
          ... on MsgAddPackage {
            creator
            package {
              path
              name
              files {
                name
                body
              }
            }
          }
        }
    }
  }
}
`;
