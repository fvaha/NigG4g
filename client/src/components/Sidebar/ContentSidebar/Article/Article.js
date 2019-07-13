import React from "react";
import { Link } from "react-router-dom"


class Article extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <li>
        <Link>
          <div className="article-img">
            <img src={this.props.img}></img>
          </div>
          <div className="article-info">
            <h3>{this.props.info}</h3>
          </div>
        </Link>
      </li>
    );
  }
}

export default Article;